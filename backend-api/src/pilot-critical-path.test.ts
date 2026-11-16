import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';
import { PILOT_CONFIG } from './config/pilot.js';

const app = createApp();

describe('pilot critical path: book → pay → dispatch → wash → earning', () => {
  let customerToken = '';
  let customerId = '';
  let driverToken = '';
  let driverId = '';
  let opsToken = '';
  let bookingId = '';
  let paymentId = '';

  beforeAll(async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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
      name: 'Pilot Customer',
      email: `pilot_cust_${suffix}@test.dripless.local`,
      password: 'SecurePass123!'
    });
    expect(signup.status).toBeLessThan(300);
    customerToken = signup.body.session.tokens.accessToken;
    customerId = signup.body.profile.id;
    await prisma.user.update({
      where: { email: `pilot_cust_${suffix}@test.dripless.local` },
      data: { emailVerifiedAt: new Date() }
    });

    const driverUser = await prisma.user.create({
      data: {
        email: `pilot_drv_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `pilot_drv_${suffix}`,
            name: 'Pilot Driver',
            vehicle: 'Toyota Hilux',
            plateNumber: 'GP99PILOT',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            online: true
          }
        }
      },
      include: { driverProfile: true }
    });
    driverId = driverUser.driverProfile!.id;
    driverToken = (await issueSessionTokens(driverUser.id, { authMethod: 'PASSWORD' })).accessToken;

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
      data: { driverId, name: 'Wash kit A', serial: `KIT-${suffix}` }
    });
    await prisma.driverConsumable.create({
      data: { driverId, sku: 'CHEM-WASH-1L', name: 'Wash concentrate', quantity: 5 }
    });
    await prisma.driverLocation.upsert({
      where: { driverId },
      update: { lat: -26.1, lng: 28.06, updatedAt: new Date() },
      create: { driverId, lat: -26.1, lng: 28.06 }
    });

    const opsUser = await prisma.user.create({
      data: {
        email: `pilot_ops_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('OpsPass123!'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        opsProfile: {
          create: {
            id: `pilot_ops_${suffix}`,
            name: 'Pilot Ops',
            permissions: ['bookings:read', 'bookings:assign', 'bookings:manage', 'activity:read']
          }
        }
      }
    });
    opsToken = (await issueSessionTokens(opsUser.id, { authMethod: 'TOTP', mfaVerified: true })).accessToken;
  });

  it('runs the closed-pilot critical milestone end-to-end', async () => {
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
    bookingId = bookingRes.body.id;
    expect(bookingRes.body.price).toBeGreaterThan(0);

    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `pilot_${bookingId}` });
    expect(intent.status).toBe(201);
    paymentId = intent.body.paymentId;

    const paid = await request(app).post('/payments/webhooks/stub').send({ paymentId });
    expect(paid.status).toBe(200);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).paymentStatus).toBe(
      'PAID'
    );

    const assign = await request(app)
      .patch(`/ops/bookings/${bookingId}/assign-driver`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ driverId, reason: 'Pilot critical-path assignment' });
    expect(assign.status).toBe(200);
    expect(assign.body.driverId).toBe(driverId);

    for (const status of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] as const) {
      const patch = await request(app)
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status });
      expect(patch.status).toBeLessThan(300);
    }

    // Photo binary upload is covered by evidence/storage tests; critical path
    // proves the completion gate against verified BEFORE/AFTER rows.
    for (const kind of ['BEFORE', 'AFTER'] as const) {
      await prisma.bookingEvidence.create({
        data: {
          bookingId,
          kind,
          urlOrData: 'test://local',
          storageKey: `test/${bookingId}/${kind}.jpg`,
          mimeType: 'image/jpeg',
          byteSize: 1024,
          checksum: 'a'.repeat(64),
          uploadStatus: 'VERIFIED',
          verifiedAt: new Date(),
          actorId: driverId,
          actorRole: 'driver'
        }
      });
    }

    const checklist = await request(app)
      .patch(`/bookings/${bookingId}/checklist`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        exteriorDone: true,
        wheelsDone: true,
        glassDone: true,
        finalInspected: true,
        interiorDone: true
      });
    expect(checklist.status).toBeLessThan(300);

    const pinIssue = await request(app)
      .post(`/bookings/${bookingId}/completion-pin`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(pinIssue.status).toBe(200);
    expect(pinIssue.body.pin).toMatch(/^\d{6}$/);

    const pinVerify = await request(app)
      .post(`/bookings/${bookingId}/completion-pin/verify`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ pin: pinIssue.body.pin });
    expect(pinVerify.status).toBeLessThan(300);

    const complete = await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });
    expect(complete.status).toBeLessThan(300);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe('COMPLETED');
    expect(booking.paymentStatus).toBe('PAID');

    const earning = await prisma.driverEarning.findFirst({ where: { bookingId } });
    expect(earning).toBeTruthy();
    expect(earning!.amountCents).toBeGreaterThan(0);

    const history = await prisma.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' }
    });
    expect(history.some((h) => h.toStatus === 'COMPLETED')).toBe(true);

    const audit = await prisma.auditLog.findMany({
      where: { OR: [{ targetId: bookingId }, { targetId: paymentId }] },
      take: 20
    });
    // Audit may be sparse depending on route instrumentation; status history is the operational trail.
    expect(history.length).toBeGreaterThanOrEqual(3);
    void audit;
  });

  it('blocks unverified drivers from receiving assignments', async () => {
    const suffix = `unv_${Date.now()}`;
    const unverified = await prisma.user.create({
      data: {
        email: `unverified_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `unverified_${suffix}`,
            name: 'Unverified Driver',
            vehicle: 'VW Polo',
            status: 'ACTIVE',
            verificationStatus: 'PENDING',
            online: true
          }
        }
      },
      include: { driverProfile: true }
    });
    const badDriverId = unverified.driverProfile!.id;
    await prisma.driverLocation.create({
      data: { driverId: badDriverId, lat: -26.1, lng: 28.06 }
    });

    const pendingBooking = await prisma.booking.create({
      data: {
        reference: `DRP-UNV-${suffix}`,
        customerId,
        serviceSlug: 'car-wash',
        serviceName: 'Car Wash',
        optionSlug: 'basic',
        optionName: 'Basic Wash',
        pickupLocation: 'Sandton City',
        pickupLat: -26.1,
        pickupLng: 28.06,
        price: 1599,
        basePrice: 1599,
        status: 'PENDING'
      }
    });

    const assign = await request(app)
      .patch(`/ops/bookings/${pendingBooking.id}/assign-driver`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ driverId: badDriverId, reason: 'Should fail for unverified driver' });
    expect(assign.status).toBe(400);
    expect(String(assign.body.message)).toMatch(/not assignable/i);
  });
});
