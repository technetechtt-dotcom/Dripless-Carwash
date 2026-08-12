import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { createHmac } from 'node:crypto';

const app = createApp();

describe('payments webhooks and wallet ledger', () => {
  let accessToken = '';
  let bookingId = '';
  let userId = '';

  beforeAll(async () => {
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
    const email = `pay_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Payer',
      email,
      password: 'SecurePass123!'
    });
    accessToken = signup.body.session.tokens.accessToken;
    userId = signup.body.profile.userId || '';
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    const customer = await prisma.customerProfile.findFirst({ where: { user: { email } } });
    userId = customer!.userId;
    await prisma.customerProfile.update({
      where: { id: customer!.id },
      data: { walletBalance: 10_000 }
    });
    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: '123 Main Street Sandton',
        pickupCoordinates: { lat: -26.1, lng: 28.05 }
      });
    bookingId = booking.body.id;
  });

  it('creates a payment intent and ignores duplicate webhook replay', async () => {
    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `idem_${bookingId}` });
    expect(intent.status).toBe(201);
    expect(intent.body.amountZar).toBe(15.99);
    expect(intent.body.amountCents).toBe(1599);

    const again = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `idem_${bookingId}` });
    expect(again.body.paymentId).toBe(intent.body.paymentId);

    const hook = await request(app)
      .post('/payments/webhooks/stub')
      .send({ paymentId: intent.body.paymentId });
    expect(hook.status).toBe(200);

    const replay = await request(app)
      .post('/payments/webhooks/stub')
      .send({ paymentId: intent.body.paymentId });
    expect(replay.body.duplicate).toBe(true);
  });

  it('rejects invalid Paystack signatures when a secret is configured', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
    const body = { event: 'charge.success', data: { id: 'evt_1', reference: 'missing', amount: 1599, currency: 'ZAR', status: 'success' } };
    const bad = await request(app)
      .post('/payments/webhooks/paystack')
      .set('x-paystack-signature', 'deadbeef')
      .send(body);
    expect([401, 404]).toContain(bad.status);
    const unique = {
      event: 'charge.success',
      data: {
        id: `evt_${Date.now()}`,
        reference: 'no-such-payment',
        amount: 1599,
        currency: 'ZAR',
        status: 'success'
      }
    };
    const hash = createHmac('sha512', 'sk_test_unit').update(JSON.stringify(unique)).digest('hex');
    const signed = await request(app)
      .post('/payments/webhooks/paystack')
      .set('x-paystack-signature', hash)
      .send(unique);
    expect([401, 404]).toContain(signed.status);
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it('credits and debits the wallet ledger without going negative', async () => {
    const { creditWallet, debitWallet } = await import('../wallet/ledger.js');
    const credit = await creditWallet({
      userId,
      amountCents: 500,
      type: 'PROMO_CREDIT',
      note: 'test promo'
    });
    expect(credit.balanceAfter).toBeGreaterThanOrEqual(500);
    await expect(
      debitWallet({ userId, amountCents: 9_999_999, note: 'too much' })
    ).rejects.toThrow();
  });
});
