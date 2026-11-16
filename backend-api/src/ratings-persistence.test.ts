/**
 * Bidirectional ratings persistence: customer→driver and driver→customer.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './db/prisma.js';
import { hashPassword } from './auth/password.js';
import { issueSessionTokens } from './auth/tokens.js';

const app = createApp();

describe('booking ratings persistence', () => {
  let customerToken = '';
  let driverToken = '';
  let customerId = '';
  let driverId = '';
  let bookingId = '';

  beforeAll(async () => {
    const suffix = Date.now().toString(36);
    await prisma.service.upsert({
      where: { slug: 'car-wash' },
      update: {},
      create: {
        slug: 'car-wash',
        name: 'Car Wash',
        options: {
          create: [{ slug: 'basic', name: 'Basic Wash', basePrice: 1599, ecoPointsAward: 160 }]
        }
      }
    });

    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Rating Customer',
      email: `rate_cust_${suffix}@test.dripless.local`,
      password: 'SecurePass123!'
    });
    customerToken = signup.body.session.tokens.accessToken;
    customerId = signup.body.profile.id;
    await prisma.user.update({
      where: { email: `rate_cust_${suffix}@test.dripless.local` },
      data: { emailVerifiedAt: new Date() }
    });

    const driverUser = await prisma.user.create({
      data: {
        email: `rate_drv_${suffix}@test.dripless.local`,
        passwordHash: await hashPassword('DriverPass123!'),
        role: 'driver',
        emailVerifiedAt: new Date(),
        driverProfile: {
          create: {
            id: `rate_drv_${suffix}`,
            name: 'Rating Driver',
            vehicle: 'Toyota',
            plateNumber: 'GP99RATE',
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

    const booking = await prisma.booking.create({
      data: {
        reference: `DRP-RATE-${suffix}`,
        customerId,
        driverId,
        serviceSlug: 'car-wash',
        serviceName: 'Car Wash',
        optionSlug: 'basic',
        optionName: 'Basic Wash',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        pickupLocation: 'Sandton',
        pickupLat: -26.1,
        pickupLng: 28.05,
        price: 1599,
        basePrice: 1599,
        ecoPoints: 160
      }
    });
    bookingId = booking.id;
  });

  it('persists customer→driver rating and updates driver aggregate', async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/rating`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ stars: 5, comment: 'Great wash' });
    expect(res.status).toBe(201);
    expect(res.body.stars).toBe(5);

    const driver = await prisma.driverProfile.findUniqueOrThrow({ where: { id: driverId } });
    expect(driver.rating).toBe(5);
  });

  it('persists driver→customer rating and updates customer aggregate', async () => {
    const res = await request(app)
      .post(`/bookings/${bookingId}/customer-rating`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ stars: 4, comment: 'Friendly customer' });
    expect(res.status).toBe(201);
    expect(res.body.stars).toBe(4);

    const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { id: customerId } });
    expect(customer.rating).toBe(4);

    const row = await prisma.customerRating.findUnique({
      where: { bookingId_driverId: { bookingId, driverId } }
    });
    expect(row?.stars).toBe(4);
  });
});
