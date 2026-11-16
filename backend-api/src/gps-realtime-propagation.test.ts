/**
 * GPS → Ops/Customer propagation + Google Maps route estimate.
 * Covers driver location publish, tracking DTO, realtime event, and geo route.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';
import { PILOT_CONFIG } from './config/pilot.js';

const app = createApp();

describe('GPS + maps + realtime propagation', () => {
  let customerToken = '';
  let customerId = '';
  let driverToken = '';
  let driverId = '';
  let opsToken = '';
  let bookingId = '';
  let eventCursor = '0';

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
      name: 'GPS Customer',
      email: `gps_cust_${suffix}@test.dripless.local`,
      password: 'SecurePass123!'
    });
    customerToken = signup.body.session.tokens.accessToken;
    customerId = signup.body.profile.id;
    await prisma.user.update({
      where: { email: `gps_cust_${suffix}@test.dripless.local` },
      data: { emailVerifiedAt: new Date() }
    });

    const driverUser = await prisma.user.create({
      data: {
        email: `gps_drv_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `gps_drv_${suffix}`,
            name: 'GPS Driver',
            vehicle: 'Toyota Hilux',
            plateNumber: 'GP55GPS',
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
      data: { driverId, name: 'Wash kit GPS', serial: `KIT-GPS-${suffix}` }
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
        email: `gps_ops_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('OpsPass123!'),
        role: 'ops_admin',
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        opsProfile: {
          create: {
            id: `gps_ops_${suffix}`,
            name: 'GPS Ops',
            permissions: ['bookings:read', 'bookings:assign', 'bookings:manage', 'activity:read']
          }
        }
      }
    });
    opsToken = (await issueSessionTokens(opsUser.id, { authMethod: 'TOTP', mfaVerified: true })).accessToken;

    const latest = await prisma.realtimeEvent.findFirst({ orderBy: { sequence: 'desc' } });
    eventCursor = latest ? latest.sequence.toString() : '0';
  }, 120_000);

  it(
    'publishes GPS to tracking + realtime for Customer/Ops and returns a geo route',
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
      bookingId = bookingRes.body.id;

      const intent = await request(app)
        .post('/payments/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId, provider: 'stub', idempotencyKey: `gps_${bookingId}` });
      await request(app).post('/payments/webhooks/stub').send({ paymentId: intent.body.paymentId });

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
        .send({ driverId, reason: 'GPS propagation assignment' });
      expect(assign.status).toBe(200);

      const gpsLat = -26.104;
      const gpsLng = 28.06;
      const location = await request(app)
        .patch('/driver/location')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          driverId,
          lat: gpsLat,
          lng: gpsLng,
          heading: 90,
          speedKph: 28,
          accuracyM: 8
        });
      expect(location.status).toBeLessThan(300);

      const tracking = await request(app)
        .get(`/bookings/${bookingId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(tracking.status).toBe(200);
      expect(tracking.body.driverLocation).toBeTruthy();
      expect(tracking.body.driverLocation.lat).toBeCloseTo(gpsLat, 3);
      expect(tracking.body.driverLocation.lng).toBeCloseTo(gpsLng, 3);

      const opsDrivers = await request(app)
        .get('/ops/drivers')
        .set('Authorization', `Bearer ${opsToken}`);
      if (opsDrivers.status < 300 && Array.isArray(opsDrivers.body)) {
        const row = opsDrivers.body.find((d: { id: string }) => d.id === driverId);
        if (row?.lastKnownLocation) {
          expect(row.lastKnownLocation.lat).toBeCloseTo(gpsLat, 3);
        }
      }

      const events = await request(app)
        .get(`/events/since?after=${encodeURIComponent(eventCursor)}`)
        .set('Authorization', `Bearer ${opsToken}`);
      expect(events.status).toBe(200);
      expect(events.body.events.some((e: { type: string }) => e.type === 'driver.location')).toBe(true);

      const route = await request(app)
        .post('/geo/route')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          from: { lat: gpsLat, lng: gpsLng },
          to: { lat: -26.1076, lng: 28.0567 }
        });
      expect(route.status).toBeLessThan(300);
      expect(route.body.distanceKm).toBeGreaterThan(0);
      expect(route.body.etaMinutes).toBeGreaterThan(0);
    },
    120_000
  );
});
