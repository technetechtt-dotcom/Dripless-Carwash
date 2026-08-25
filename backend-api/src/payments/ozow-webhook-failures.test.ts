/**
 * Ozow sandbox failure scenarios: Cancelled, Error, amount mismatch, bad signature.
 * Uses a stub payment row flipped to provider=ozow so CI does not need live Ozow credentials.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { buildOzowNotifyHash } from './ozow.js';

const app = createApp();
const PRIVATE_KEY = 'test-ozow-private-key';
const SITE_CODE = 'TST-SITE';

function signedNotify(fields: Record<string, string>) {
  const body = {
    SiteCode: SITE_CODE,
    Optional1: '',
    Optional2: '',
    Optional3: '',
    Optional4: '',
    Optional5: '',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: '',
    ...fields
  };
  return { ...body, Hash: buildOzowNotifyHash(body, PRIVATE_KEY) };
}

describe('Ozow sandbox webhook failure scenarios', () => {
  let accessToken = '';
  let bookingId = '';
  let paymentId = '';
  const previousKey = env.OZOW_PRIVATE_KEY;
  const previousSite = env.OZOW_SITE_CODE;

  beforeAll(async () => {
    env.OZOW_PRIVATE_KEY = PRIVATE_KEY;
    env.OZOW_SITE_CODE = SITE_CODE;

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

    const email = `ozow_fail_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Ozow Fail Customer',
      email,
      password: 'SecurePass123!'
    });
    accessToken = signup.body.session.tokens.accessToken;
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });

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

    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bookingId, provider: 'stub', idempotencyKey: `ozow_fail_${bookingId}` });
    expect(intent.status).toBe(201);
    paymentId = intent.body.paymentId;

    await prisma.payment.update({
      where: { id: paymentId },
      data: { provider: 'ozow', externalRef: paymentId }
    });
  });

  afterAll(() => {
    env.OZOW_PRIVATE_KEY = previousKey;
    env.OZOW_SITE_CODE = previousSite;
  });

  it('marks payment FAILED on Status=Cancelled', async () => {
    const body = signedNotify({
      TransactionId: `txn_cancel_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Cancelled',
      StatusMessage: 'Customer cancelled'
    });
    const res = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(res.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('FAILED');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paymentStatus).toBe('FAILED');
  });

  it('marks payment FAILED on Status=Error and is idempotent on replay', async () => {
    const email = `ozow_err_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Ozow Err',
      email,
      password: 'SecurePass123!'
    });
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${signup.body.session.tokens.accessToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: '123 Main Street Sandton',
        pickupCoordinates: { lat: -26.1, lng: 28.05 }
      });
    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${signup.body.session.tokens.accessToken}`)
      .send({
        bookingId: booking.body.id,
        provider: 'stub',
        idempotencyKey: `ozow_err_${booking.body.id}`
      });
    await prisma.payment.update({
      where: { id: intent.body.paymentId },
      data: { provider: 'ozow', externalRef: intent.body.paymentId }
    });

    const body = signedNotify({
      TransactionId: `txn_error_${intent.body.paymentId}`,
      TransactionReference: intent.body.paymentId,
      Amount: '15.99',
      Status: 'Error',
      StatusMessage: 'Bank declined'
    });
    const first = await request(app).post('/payments/webhooks/ozow').send(body);
    const replay = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: intent.body.paymentId } });
    expect(payment.status).toBe('FAILED');
    expect(
      await prisma.paymentEvent.count({
        where: { paymentId: intent.body.paymentId, eventType: 'payment.failed' }
      })
    ).toBe(1);
  });

  it('rejects amount mismatch with 400 and leaves payment unpaid', async () => {
    const email = `ozow_amt_${Date.now()}@test.dripless.local`;
    const signup = await request(app).post('/auth/customer/signup').send({
      name: 'Ozow Amt',
      email,
      password: 'SecurePass123!'
    });
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${signup.body.session.tokens.accessToken}`)
      .send({
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: '123 Main Street Sandton',
        pickupCoordinates: { lat: -26.1, lng: 28.05 }
      });
    const intent = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${signup.body.session.tokens.accessToken}`)
      .send({
        bookingId: booking.body.id,
        provider: 'stub',
        idempotencyKey: `ozow_amt_${booking.body.id}`
      });
    await prisma.payment.update({
      where: { id: intent.body.paymentId },
      data: { provider: 'ozow', externalRef: intent.body.paymentId }
    });

    const body = signedNotify({
      TransactionId: `txn_amt_${intent.body.paymentId}`,
      TransactionReference: intent.body.paymentId,
      Amount: '1.00',
      Status: 'Complete'
    });
    const res = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(res.status).toBe(400);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: intent.body.paymentId } });
    expect(payment.status).not.toBe('PAID');
  });

  it('rejects tampered Hash with 401', async () => {
    const body = signedNotify({
      TransactionId: `txn_tamper_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Complete'
    });
    body.Hash = '0'.repeat(128);
    const res = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(res.status).toBe(401);
  });
});
