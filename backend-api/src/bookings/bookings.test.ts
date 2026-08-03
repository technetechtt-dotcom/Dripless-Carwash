import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';

const app = createApp();

describe('booking ownership and pricing', () => {
  let accessToken = '';
  let customerId = '';

  beforeAll(async () => {
    await prisma.service.upsert({
      where: { slug: 'car-wash' },
      update: {},
      create: {
        slug: 'car-wash',
        name: 'Car Wash',
        options: {
          create: [
            {
              slug: 'basic',
              name: 'Basic Wash',
              basePrice: 15.99,
              ecoPointsAward: 160
            }
          ]
        }
      }
    });

    const email = `book_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Booker',
      email,
      password: 'SecurePass123!'
    });
    accessToken = signup.body.session.tokens.accessToken;
    customerId = signup.body.profile.id;

    // Booking requires verified email; mark verified for this security test.
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() }
    });
  });

  it('forces authenticated customer id and ignores client price tampering', async () => {
    const otherId = 'customer_someone_else';
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerId: otherId,
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: '123 Main Street Sandton',
        pickupCoordinates: { lat: -26.1, lng: 28.05 },
        price: 0,
        basePrice: 0,
        discountAmount: 999
      });

    expect(res.status).toBe(201);
    expect(res.body.customerId).toBe(customerId);
    expect(res.body.customerId).not.toBe(otherId);
    expect(res.body.price).toBe(15.99);
    expect(res.body.basePrice).toBe(15.99);
    expect(res.body.discountAmount).toBe(0);
  });
});
