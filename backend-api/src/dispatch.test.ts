import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';

const app = createApp();

describe('dispatch race conditions and RBAC', () => {
  let opsAccessToken = '';
  let driverAccessToken = '';
  let driverId = '';
  let bookingId = '';
  let customerId = '';

  beforeAll(async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await prisma.service.upsert({
      where: { slug: 'car-wash' },
      update: {},
      create: {
        slug: 'car-wash',
        name: 'Car Wash',
        options: { create: [{ slug: 'basic', name: 'Basic Wash', basePrice: 1599, ecoPointsAward: 160 }] }
      }
    });

    const opsUser = await prisma.user.create({
      data: {
        email: `dispatch_ops_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('OpsPass123!'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        opsProfile: {
          create: {
            id: `dispatch_ops_${suffix}`,
            name: 'Dispatch Ops',
            permissions: ['bookings:read', 'bookings:manage', 'bookings:assign', 'drivers:read', 'dispatch:manage']
          }
        }
      }
    });
    opsAccessToken = (await issueSessionTokens(opsUser.id, { authMethod: 'TOTP', mfaVerified: true })).accessToken;

    const driverUser = await prisma.user.create({
      data: {
        email: `dispatch_driver_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `dispatch_drv_${suffix}`,
            name: 'Test Driver',
            vehicle: 'Toyota Corolla',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            online: true
          }
        }
      }
    });
    const drv = await prisma.driverProfile.findFirst({ where: { userId: driverUser.id } });
    driverId = drv!.id;
    await prisma.driverLocation.upsert({
      where: { driverId },
      update: { lat: -26.1, lng: 28.05, updatedAt: new Date() },
      create: { driverId, lat: -26.1, lng: 28.05 }
    });
    driverAccessToken = (await issueSessionTokens(driverUser.id, { authMethod: 'PASSWORD' })).accessToken;

    const custUser = await prisma.user.create({
      data: {
        email: `dispatch_cust_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('CustPass123!'),
        role: 'customer',
        emailVerifiedAt: new Date(),
        customerProfile: { create: { id: `dispatch_cust_${suffix}`, name: 'Test Customer' } }
      }
    });
    const cust = await prisma.customerProfile.findFirst({ where: { userId: custUser.id } });
    customerId = cust!.id;

    const booking = await prisma.booking.create({
      data: {
        reference: `DRP-DISPATCH-${suffix}`,
        customerId,
        serviceSlug: 'car-wash',
        serviceName: 'Car Wash',
        optionSlug: 'basic',
        optionName: 'Basic Wash',
        pickupLocation: '123 Test Street Sandton',
        pickupLat: -26.1,
        pickupLng: 28.05,
        price: 1599,
        basePrice: 1599,
        status: 'PENDING'
      }
    });
    bookingId = booking.id;
  });

  it('prevents double assignment: second concurrent assign conflicts or is idempotent', async () => {
    const body = { driverId, reason: 'Manual pilot assignment for concurrent race test' };
    const [result1, result2] = await Promise.all([
      request(app)
        .patch(`/ops/bookings/${bookingId}/assign-driver`)
        .set('Authorization', `Bearer ${opsAccessToken}`)
        .send(body),
      request(app)
        .patch(`/ops/bookings/${bookingId}/assign-driver`)
        .set('Authorization', `Bearer ${opsAccessToken}`)
        .send(body)
    ]);

    const statuses = [result1.status, result2.status].sort();
    expect(statuses.some((s) => s === 200)).toBe(true);
    expect(statuses.every((s) => [200, 409, 400].includes(s))).toBe(true);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.driverId).toBe(driverId);
  });

  it('driver cannot access ops booking list', async () => {
    const response = await request(app)
      .get('/ops/bookings')
      .set('Authorization', `Bearer ${driverAccessToken}`);
    expect([403, 401]).toContain(response.status);
  });

  it('customer cannot assign drivers via ops assign endpoint', async () => {
    const custSignup = await request(app).post('/auth/customer/signup').send({
      name: 'Unauth Customer',
      email: `unauth_${Date.now()}@test.dripless.local`,
      password: 'SecurePass123!'
    });
    const custToken = custSignup.body.session.tokens.accessToken;
    const response = await request(app)
      .patch(`/ops/bookings/${bookingId}/assign-driver`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ driverId, reason: 'Customer should not be able to assign' });
    expect([403, 401]).toContain(response.status);
  });

  it('ops without bookings:assign permission cannot force-assign', async () => {
    const suffix2 = `nodispatch_${Date.now()}`;
    const limitedOps = await prisma.user.create({
      data: {
        email: `limited_${suffix2}@test.dripless.local`,
        passwordHash: await hashPassword('OpsPass123!'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        opsProfile: {
          create: {
            id: `limited_${suffix2}`,
            name: 'Limited Ops',
            permissions: ['bookings:read']
          }
        }
      }
    });
    const limitedToken = (
      await issueSessionTokens(limitedOps.id, { authMethod: 'TOTP', mfaVerified: true })
    ).accessToken;
    const response = await request(app)
      .patch(`/ops/bookings/${bookingId}/assign-driver`)
      .set('Authorization', `Bearer ${limitedToken}`)
      .send({ driverId, reason: 'Should be forbidden without bookings:assign' });
    expect([403, 401]).toContain(response.status);
  });
});

describe('pricing engine', () => {
  it('correctly applies vehicle-size modifiers', async () => {
    const { resolveServerPrice } = await import('./catalog/pricing.js');
    const sedanPrice = await resolveServerPrice({
      serviceSlug: 'car-wash',
      optionSlug: 'basic',
      vehicleSize: 'SEDAN',
      role: 'customer',
      userId: 'test_user'
    });
    const suvPrice = await resolveServerPrice({
      serviceSlug: 'car-wash',
      optionSlug: 'basic',
      vehicleSize: 'SUV',
      role: 'customer',
      userId: 'test_user'
    });
    expect(sedanPrice.price).toBeGreaterThan(0);
    expect(suvPrice.price).toBeGreaterThanOrEqual(sedanPrice.price);
  });

  it('applies surcharge for muddy conditions when a rule exists', async () => {
    const { resolveServerPrice } = await import('./catalog/pricing.js');
    const clean = await resolveServerPrice({
      serviceSlug: 'car-wash',
      optionSlug: 'basic',
      role: 'customer',
      userId: 'test_user'
    });
    await prisma.pricingRule.upsert({
      where: { id: 'test-muddy-rule' },
      update: { amountCents: 500, active: true, condition: 'muddy' },
      create: {
        id: 'test-muddy-rule',
        name: 'Muddy surcharge',
        ruleType: 'CONDITION_SURCHARGE',
        condition: 'muddy',
        amountCents: 500,
        active: true
      }
    });
    const muddy = await resolveServerPrice({
      serviceSlug: 'car-wash',
      optionSlug: 'basic',
      role: 'customer',
      userId: 'test_user',
      condition: 'muddy'
    });
    expect(muddy.price).toBeGreaterThan(clean.price);
    expect(muddy.surchargeCents).toBe(500);
  });
});

describe('service area enforcement', () => {
  it('rejects booking outside any active service zone', async () => {
    const email = `ooz_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Out of Zone',
      email,
      password: 'SecurePass123!'
    });
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() }
    });

    await prisma.serviceArea.upsert({
      where: { slug: 'sandton-pilot' },
      update: {
        active: true,
        operatingFrom: '06:00',
        operatingTo: '20:00',
        polygonGeoJson: {
          type: 'Polygon',
          coordinates: [
            [
              [28.0, -26.14],
              [28.1, -26.14],
              [28.1, -26.08],
              [28.0, -26.08],
              [28.0, -26.14]
            ]
          ]
        }
      },
      create: {
        name: 'Sandton pilot',
        slug: 'sandton-pilot',
        active: true,
        operatingFrom: '06:00',
        operatingTo: '20:00',
        polygonGeoJson: {
          type: 'Polygon',
          coordinates: [
            [
              [28.0, -26.14],
              [28.1, -26.14],
              [28.1, -26.08],
              [28.0, -26.08],
              [28.0, -26.14]
            ]
          ]
        }
      }
    });

    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${signup.body.session.tokens.accessToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: 'Cape Town City Centre',
        pickupCoordinates: { lat: -33.9249, lng: 18.4241 }
      });

    expect(booking.status).toBe(400);
    expect(String(booking.body.message || '')).toMatch(/outside|service area/i);
  });
});
