import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { createHmac } from 'node:crypto';
import { applyWalletEntry, creditWallet, reconcileWallets } from '../wallet/ledger.js';
import {
  applyPaymentSuccess,
  claimWebhookReceipt,
  completeWebhookReceipt,
  processRefund
} from './service.js';
import { verifyPaystackSignature } from './paystack.js';

const app = createApp();

describe('payments webhooks and wallet ledger', () => {
  let accessToken = '';
  let bookingId = '';
  let userId = '';
  let customerId = '';
  let paymentId = '';

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
    customerId = customer!.id;
    await creditWallet({
      userId,
      amountCents: 10_000,
      idempotencyKey: `opening_${userId}`,
      note: 'test opening cash balance'
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
    paymentId = intent.body.paymentId;

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
    expect(await prisma.paymentEvent.count({ where: { paymentId, eventType: 'payment.success' } })).toBe(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).paymentStatus).toBe('PAID');
  });

  it('verifies the exact Paystack bytes with a timing-safe signature', () => {
    const secret = 'sk_test_unit';
    const raw = Buffer.from('{"amount":1599,"currency":"ZAR"}');
    const signature = createHmac('sha512', secret).update(raw).digest('hex');
    expect(verifyPaystackSignature(raw, signature, secret)).toBe(true);
    expect(verifyPaystackSignature(Buffer.from('{"currency":"ZAR","amount":1599}'), signature, secret)).toBe(false);
    expect(verifyPaystackSignature(raw, 'deadbeef', secret)).toBe(false);
  });

  it('rejects altered webhook replay payloads', async () => {
    const eventId = `replay_${Date.now()}`;
    const claim = await claimWebhookReceipt({
      provider: 'stub', providerEventId: eventId, signatureValid: true, payload: { value: 1 }
    });
    await completeWebhookReceipt(claim.receiptId);
    await expect(claimWebhookReceipt({
      provider: 'stub', providerEventId: eventId, signatureValid: true, payload: { value: 2 }
    })).rejects.toThrow('different payload');
  });

  it('rejects wrong amount and currency before recording a success event', async () => {
    const eventId = `wrong_${Date.now()}`;
    await expect(applyPaymentSuccess({
      paymentId, providerEventId: eventId, payload: {}, amountCents: 1600, currency: 'ZAR'
    })).rejects.toThrow('Amount mismatch');
    expect(await prisma.paymentEvent.count({ where: { paymentId, providerEventId: eventId } })).toBe(0);
  });

  it('keeps wallet idempotency, component balances, and promo withdrawal rules intact', async () => {
    const key = `promo_${Date.now()}`;
    const credit = await creditWallet({
      userId,
      amountCents: 500,
      type: 'PROMO_CREDIT',
      idempotencyKey: key,
      note: 'test promo'
    });
    const duplicate = await creditWallet({ userId, amountCents: 500, type: 'PROMO_CREDIT', idempotencyKey: key });
    expect(duplicate.id).toBe(credit.id);
    expect(await prisma.walletLedgerEntry.count({ where: { idempotencyKey: key } })).toBe(1);
    await expect(
      prisma.$transaction((tx) => applyWalletEntry(tx, {
        userId, amountCents: 10_500, type: 'PAYOUT', idempotencyKey: `withdraw_${Date.now()}`
      }))
    ).rejects.toThrow('withdrawable');
    const reconciliation = await reconcileWallets();
    expect(reconciliation.mismatches.some((row) => row.customerId === customerId)).toBe(false);
  });

  it('handles partial and full refunds without exceeding the captured payment', async () => {
    const first = await processRefund({
      paymentId, amountCents: 300, reason: 'partial test', idempotencyKey: `refund_a_${paymentId}`
    });
    const duplicate = await processRefund({
      paymentId, amountCents: 300, reason: 'partial test', idempotencyKey: `refund_a_${paymentId}`
    });
    expect(duplicate?.id).toBe(first?.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('PARTIALLY_REFUNDED');
    await processRefund({
      paymentId, amountCents: 1299, reason: 'final test', idempotencyKey: `refund_b_${paymentId}`
    });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('REFUNDED');
    await expect(processRefund({
      paymentId, amountCents: 1, reason: 'too much', idempotencyKey: `refund_c_${paymentId}`
    })).rejects.toThrow();
  });
});
