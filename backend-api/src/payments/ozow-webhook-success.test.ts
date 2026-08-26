/**
 * Ozow success, duplicate notify, late Complete after Cancelled, currency mismatch, and sync.
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

async function createOzowPayment() {
  const email = `ozow_ok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.dripless.local`;
  const signup = await request(app).post('/auth/customer/signup').send({
    name: 'Ozow Success Customer',
    email,
    password: 'SecurePass123!'
  });
  const accessToken = signup.body.session.tokens.accessToken as string;
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
  const intent = await request(app)
    .post('/payments/intent')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      bookingId: booking.body.id,
      provider: 'stub',
      idempotencyKey: `ozow_ok_${booking.body.id}`
    });
  await prisma.payment.update({
    where: { id: intent.body.paymentId },
    data: { provider: 'ozow', externalRef: intent.body.paymentId }
  });
  return { accessToken, bookingId: booking.body.id as string, paymentId: intent.body.paymentId as string };
}

describe('Ozow sandbox webhook success scenarios', () => {
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
  });

  afterAll(() => {
    env.OZOW_PRIVATE_KEY = previousKey;
    env.OZOW_SITE_CODE = previousSite;
  });

  it('marks payment PAID on Status=Complete', async () => {
    const { bookingId, paymentId } = await createOzowPayment();
    const body = signedNotify({
      TransactionId: `txn_ok_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Complete'
    });
    const res = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(res.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('PAID');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paymentStatus).toBe('PAID');
  });

  it('is idempotent on duplicate Complete notify', async () => {
    const { paymentId } = await createOzowPayment();
    const body = signedNotify({
      TransactionId: `txn_dup_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Complete'
    });
    const first = await request(app).post('/payments/webhooks/ozow').send(body);
    const replay = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(
      await prisma.paymentEvent.count({
        where: { paymentId, eventType: 'payment.success' }
      })
    ).toBe(1);
  });

  it('applies a late Complete after Cancelled (browser closed before return)', async () => {
    const { bookingId, paymentId } = await createOzowPayment();
    const cancelled = signedNotify({
      TransactionId: `txn_late_cancel_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Cancelled'
    });
    expect((await request(app).post('/payments/webhooks/ozow').send(cancelled)).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('FAILED');

    const complete = signedNotify({
      TransactionId: `txn_late_ok_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Complete'
    });
    expect((await request(app).post('/payments/webhooks/ozow').send(complete)).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('PAID');
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).paymentStatus).toBe('PAID');
  });

  it('rejects non-ZAR currency', async () => {
    const { paymentId } = await createOzowPayment();
    const body = signedNotify({
      TransactionId: `txn_usd_${paymentId}`,
      TransactionReference: paymentId,
      Amount: '15.99',
      Status: 'Complete',
      CurrencyCode: 'USD'
    });
    const res = await request(app).post('/payments/webhooks/ozow').send(body);
    expect(res.status).toBe(400);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).not.toBe('PAID');
  });

  it('customer sync returns 202 when Ozow lookup is unavailable (provider downtime)', async () => {
    const { accessToken, paymentId } = await createOzowPayment();
    const previousApiKey = env.OZOW_API_KEY;
    env.OZOW_API_KEY = '';
    const res = await request(app)
      .post(`/payments/${paymentId}/sync`)
      .set('Authorization', `Bearer ${accessToken}`);
    env.OZOW_API_KEY = previousApiKey;
    expect(res.status).toBe(202);
    expect(res.body.sync).toBe('pending_provider');
  });
});
