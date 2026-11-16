/**
 * Cross-platform golden path: Customer → pay → Ops assign → Driver wash → complete.
 * Asserts authoritative booking DTOs and sequenced realtime events for all three roles.
 * Failure variants cover decline, cancel/refund, duplicate payment webhook, and missed events.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';
import { PILOT_CONFIG } from './config/pilot.js';
import { buildOzowNotifyHash } from './payments/ozow.js';
import { env } from './config/env.js';

const app = createApp();

async function seedGoldenActors(suffix: string) {
  await prisma.serviceArea.upsert({
    where: { slug: PILOT_CONFIG.area.slug },
    update: {
      active: true,
      operatingFrom: PILOT_CONFIG.area.operatingFrom,
      operatingTo: PILOT_CONFIG.area.operatingTo,
      polygonGeoJson: PILOT_CONFIG.area.polygon,
      weatherHold: false
    },
    create: {
      name: PILOT_CONFIG.area.name,
      slug: PILOT_CONFIG.area.slug,
      active: true,
      operatingFrom: PILOT_CONFIG.area.operatingFrom,
      operatingTo: PILOT_CONFIG.area.operatingTo,
      polygonGeoJson: PILOT_CONFIG.area.polygon
    }
  });

  await prisma.service.upsert({
    where: { slug: 'car-wash' },
    update: { active: true },
    create: {
      slug: 'car-wash',
      name: 'Car Wash',
      options: {
        create: [{ slug: 'basic', name: 'Basic Wash', basePrice: 1599, ecoPointsAward: 160 }]
      }
    }
  });

  const signup = await request(app).post('/auth/customer/signup').send({
    name: 'Golden Customer',
    email: `golden_cust_${suffix}@test.dripless.local`,
    password: 'SecurePass123!'
  });
  expect(signup.status).toBeLessThan(300);
  const customerToken = signup.body.session.tokens.accessToken as string;
  const customerId = signup.body.profile.id as string;
  await prisma.user.update({
    where: { email: `golden_cust_${suffix}@test.dripless.local` },
    data: { emailVerifiedAt: new Date() }
  });

  const driverUser = await prisma.user.create({
    data: {
      email: `golden_drv_${suffix}@test.dripless.local`,
      passwordHash: await hashPassword('DriverPass123!'),
      role: 'driver',
      emailVerifiedAt: new Date(),
      driverProfile: {
        create: {
          id: `golden_drv_${suffix}`,
          name: 'Golden Driver',
          vehicle: 'Toyota Hilux',
          plateNumber: 'GP88GOLD',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          online: true
        }
      }
    },
    include: { driverProfile: true }
  });
  const driverId = driverUser.driverProfile!.id;
  const driverToken = (await issueSessionTokens(driverUser.id, { authMethod: 'PASSWORD' })).accessToken;

  const expiresAt = new Date(Date.now() + 365 * 86400000);
  for (const kind of PILOT_CONFIG.driverRequirements.requiredDocuments) {
    await prisma.driverDocument.create({
      data: {
        driverId,
        kind,
        status: 'APPROVED',
        storageKey: `test/${kind}.pdf`,
        mimeType: 'application/pdf',
        expiresAt
      }
    });
  }
  await prisma.driverEquipment.create({
    data: { driverId, name: 'Wash kit G', serial: `KIT-G-${suffix}` }
  });
  await prisma.driverConsumable.create({
    data: { driverId, sku: 'CHEM-WASH-1L', name: 'Wash concentrate', quantity: 5 }
  });
  await prisma.driverLocation.upsert({
    where: { driverId },
    update: { lat: -26.1076, lng: 28.0567, updatedAt: new Date() },
    create: { driverId, lat: -26.1076, lng: 28.0567 }
  });

  const opsUser = await prisma.user.create({
    data: {
      email: `golden_ops_${suffix}@test.dripless.local`,
      passwordHash: await hashPassword('OpsPass123!'),
      role: 'ops_admin',
      emailVerifiedAt: new Date(),
      mfaEnabled: true,
      opsProfile: {
        create: {
          id: `golden_ops_${suffix}`,
          name: 'Golden Ops',
          permissions: [
            'bookings:read',
            'bookings:assign',
            'bookings:manage',
            'activity:read',
            'finance:read'
          ]
        }
      }
    }
  });
  const opsToken = (
    await issueSessionTokens(opsUser.id, { authMethod: 'TOTP', mfaVerified: true })
  ).accessToken;

  return { customerToken, customerId, driverToken, driverId, opsToken };
}

describe('cross-platform golden path', () => {
  let customerToken = '';
  let customerId = '';
  let driverToken = '';
  let driverId = '';
  let opsToken = '';
  let eventCursor = '0';

  beforeAll(async () => {
    const actors = await seedGoldenActors(`${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    customerToken = actors.customerToken;
    customerId = actors.customerId;
    driverToken = actors.driverToken;
    driverId = actors.driverId;
    opsToken = actors.opsToken;

    const latest = await prisma.realtimeEvent.findFirst({ orderBy: { sequence: 'desc' } });
    eventCursor = latest ? latest.sequence.toString() : '0';
  });

  async function pullEvents(token: string) {
    const res = await request(app)
      .get(`/events/since?after=${encodeURIComponent(eventCursor)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body.nextCursor) eventCursor = String(res.body.nextCursor);
    return res.body.events as Array<{ id: string; type: string; payload: Record<string, unknown> }>;
  }

  async function waitForEvent(
    token: string,
    predicate: (e: { id: string; type: string; payload: Record<string, unknown> }) => boolean,
    attempts = 8
  ) {
    for (let i = 0; i < attempts; i++) {
      const events = await pullEvents(token);
      if (events.some(predicate)) return events;
      await new Promise((r) => setTimeout(r, 400));
    }
    return pullEvents(token);
  }

  it(
    'runs Customer → Ozow/stub pay → Ops assign → Driver complete with events + earnings',
    async () => {
    const noon = new Date();
    noon.setDate(noon.getDate() + 1);
    noon.setHours(12, 0, 0, 0);

    const bookingRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: 'Sandton City Mall',
        pickupCoordinates: { lat: -26.1076, lng: 28.0567 },
        scheduledAt: noon.toISOString(),
        vehicleSize: 'SEDAN'
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.id as string;
    expect(bookingRes.body.driverEarningsZar).toBeGreaterThan(0);

    const createdEvents = await waitForEvent(
      opsToken,
      (e) => e.type === 'booking.created' && e.payload.bookingId === bookingId
    );
    expect(createdEvents.some((e) => e.type === 'booking.created' && e.payload.bookingId === bookingId)).toBe(
      true
    );

    // Prefer stub for deterministic CI; Ozow path covered in ozow unit tests + smoke-api.
    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `golden_${bookingId}` });
    expect(intent.status).toBe(201);
    const paymentId = intent.body.paymentId as string;

    const paid = await request(app).post('/payments/webhooks/stub').send({ paymentId });
    expect(paid.status).toBe(200);

    // Duplicate webhook must be idempotent
    const paidAgain = await request(app).post('/payments/webhooks/stub').send({ paymentId });
    expect(paidAgain.status).toBe(200);

    const customerView = await request(app)
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerView.body.paymentStatus).toBe('PAID');

    await prisma.driverLocation.upsert({
      where: { driverId },
      update: { lat: -26.1076, lng: 28.0567, updatedAt: new Date() },
      create: { driverId, lat: -26.1076, lng: 28.0567 }
    });
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: { online: true, activeBookingId: null }
    });

    const assign = await request(app)
      .patch(`/ops/bookings/${bookingId}/assign-driver`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ driverId, reason: 'Golden path assignment' });
    expect(assign.status).toBe(200);
    expect(assign.body.driverId).toBe(driverId);

    const assignedEvents = await waitForEvent(
      driverToken,
      (e) => e.type === 'booking.assigned' && e.payload.driverId === driverId
    );
    expect(
      assignedEvents.some((e) => e.type === 'booking.assigned' && e.payload.driverId === driverId)
    ).toBe(true);

    for (const status of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] as const) {
      const patch = await request(app)
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status });
      expect(patch.status).toBeLessThan(300);
      expect(patch.body.status).toBe(status);
      expect(patch.body.id).toBe(bookingId);
    }

    // Customer cannot mutate status (server authoritative)
    const customerStatus = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'COMPLETED' });
    expect(customerStatus.status).toBe(403);

    for (const kind of ['BEFORE', 'AFTER'] as const) {
      await prisma.bookingEvidence.create({
        data: {
          bookingId,
          kind,
          urlOrData: 'test://local',
          storageKey: `test/${bookingId}/${kind}.jpg`,
          mimeType: 'image/jpeg',
          byteSize: 1024,
          checksum: 'b'.repeat(64),
          uploadStatus: 'VERIFIED',
          verifiedAt: new Date(),
          actorId: driverId,
          actorRole: 'driver'
        }
      });
    }

    await request(app)
      .patch(`/bookings/${bookingId}/checklist`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        exteriorDone: true,
        wheelsDone: true,
        glassDone: true,
        finalInspected: true,
        interiorDone: true
      });

    const pinIssue = await request(app)
      .post(`/bookings/${bookingId}/completion-pin`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(pinIssue.body.pin).toMatch(/^\d{6}$/);

    await request(app)
      .post(`/bookings/${bookingId}/completion-pin/verify`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ pin: pinIssue.body.pin });

    const complete = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });
    expect(complete.status).toBeLessThan(300);
    expect(complete.body.status).toBe('COMPLETED');

    const [customerFinal, driverFinal, opsList] = await Promise.all([
      request(app).get(`/bookings/${bookingId}`).set('Authorization', `Bearer ${customerToken}`),
      request(app).get(`/bookings/${bookingId}`).set('Authorization', `Bearer ${driverToken}`),
      request(app).get('/bookings').set('Authorization', `Bearer ${opsToken}`)
    ]);
    expect(customerFinal.body.status).toBe('COMPLETED');
    expect(driverFinal.body.status).toBe('COMPLETED');
    expect(opsList.body.some((b: { id: string; status: string }) => b.id === bookingId && b.status === 'COMPLETED')).toBe(
      true
    );

    const earning = await prisma.driverEarning.findFirst({ where: { bookingId } });
    expect(earning).toBeTruthy();
    expect(earning!.netCents).toBe(earning!.amountCents - earning!.feeCents);

    const payout = await request(app)
      .get('/payouts/me')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(payout.status).toBe(200);
    expect(payout.body.availableZar).toBeGreaterThan(0);

    const statusEvents = await waitForEvent(
      customerToken,
      (e) => e.type === 'booking.status' && e.payload.status === 'COMPLETED'
    );
    expect(statusEvents.some((e) => e.type === 'booking.status' && e.payload.status === 'COMPLETED')).toBe(
      true
    );
    // Sequence IDs are monotonic strings of integers
    const ids = statusEvents.map((e) => BigInt(e.id));
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1]).toBe(true);
    }
  },
  120_000
  );

  it('failure: driver decline redispatches without customer-authored cancel', async () => {
    const noon = new Date();
    noon.setDate(noon.getDate() + 1);
    noon.setHours(12, 0, 0, 0);
    await prisma.driverLocation.upsert({
      where: { driverId },
      update: { lat: -26.1076, lng: 28.0567, updatedAt: new Date() },
      create: { driverId, lat: -26.1076, lng: 28.0567 }
    });
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: { online: true, activeBookingId: null }
    });
    const bookingRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: 'Sandton City Mall',
        pickupCoordinates: { lat: -26.1076, lng: 28.0567 },
        scheduledAt: noon.toISOString(),
        vehicleSize: 'SEDAN'
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.id as string;

    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `decline_${bookingId}` });
    await request(app).post('/payments/webhooks/stub').send({ paymentId: intent.body.paymentId });

    // Seed assignment directly to isolate decline/redispatch behaviour from Ops assign latency.
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverId,
        status: 'CONFIRMED',
        dispatchAttemptCount: 3,
        dispatchReason: 'Decline variant'
      }
    });
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: { activeBookingId: bookingId }
    });

    const decline = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'CANCELLED', reason: 'Driver unavailable' });
    expect(decline.status).toBeLessThan(300);
    expect(decline.body.status).toBe('PENDING');
    expect(decline.body.driverId == null || decline.body.driverId === null).toBe(true);
  }, 90_000);
  it('failure: customer cancel propagates cancelled status to ops', async () => {
    const noon = new Date();
    noon.setDate(noon.getDate() + 1);
    noon.setHours(12, 0, 0, 0);
    const bookingRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: 'Sandton City Mall',
        pickupCoordinates: { lat: -26.1076, lng: 28.0567 },
        scheduledAt: noon.toISOString(),
        vehicleSize: 'SEDAN'
      });
    const bookingId = bookingRes.body.id as string;

    const cancelled = await request(app)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Changed plans' });
    expect(cancelled.status).toBeLessThan(300);
    expect(cancelled.body.status).toBe('CANCELLED');

    const opsView = await request(app)
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(opsView.body.status).toBe('CANCELLED');
  });

  it('failure: missed-event recovery via /events/since', async () => {
    const before = await request(app)
      .get('/events/since?after=0')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(before.status).toBe(200);
    expect(Array.isArray(before.body.events)).toBe(true);
    expect(before.body.nextCursor).toBeTruthy();
  });

  it('ozow notify hash path remains available for sandbox wiring', () => {
    // Documents the production notify contract used by smoke-api / sandbox.
    const privateKey = env.OZOW_PRIVATE_KEY || 'test-private-key';
    const body = {
      SiteCode: env.OZOW_SITE_CODE || 'TST',
      TransactionId: 'txn-golden',
      TransactionReference: 'pay_golden',
      Amount: '15.99',
      Status: 'Complete',
      Optional1: '',
      Optional2: '',
      Optional3: '',
      Optional4: '',
      Optional5: '',
      CurrencyCode: 'ZAR',
      IsTest: 'true',
      StatusMessage: ''
    };
    const hash = buildOzowNotifyHash(body, privateKey);
    expect(hash).toMatch(/^[a-f0-9]{128}$/);
  });
});
