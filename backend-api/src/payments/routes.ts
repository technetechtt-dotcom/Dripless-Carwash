import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { debitWallet } from '../wallet/ledger.js';
import { enqueue } from '../lib/queue.js';
import {
  applyPaymentFailed,
  applyPaymentSuccess,
  createPaymentIntent,
  mapPaymentDto,
  processRefund,
  recordWebhookReceipt,
  verifyOzowSignature,
  verifyPayfastSignature,
  verifyPaystackSignature
} from './service.js';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/intent',
  authRequired,
  roleRequired(['customer', 'ops_admin']),
  validate(
    z.object({
      bookingId: z.string().min(1),
      provider: z.enum(['stub', 'paystack', 'payfast', 'ozow', 'wallet']).optional(),
      idempotencyKey: z.string().max(80).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.body.bookingId },
        include: { customer: { include: { user: true } } }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
        throw new HttpError(403, 'Forbidden');
      }
      if (booking.paymentStatus === 'PAID') {
        throw new HttpError(400, 'Booking already paid');
      }

      const provider = req.body.provider || env.PAYMENTS_PROVIDER;
      if (provider === 'wallet') {
        const payment = await createPaymentIntent({
          bookingId: booking.id,
          userId: booking.customer.userId,
          customerEmail: booking.customer.user.email,
          amountCents: booking.price,
          provider: 'wallet',
          idempotencyKey: req.body.idempotencyKey
        });
        await debitWallet({
          userId: booking.customer.userId,
          amountCents: booking.price,
          bookingId: booking.id,
          paymentId: payment.id,
          note: 'Booking payment'
        });
        await applyPaymentSuccess({
          paymentId: payment.id,
          providerEventId: `wallet_${payment.id}`,
          payload: { source: 'wallet' },
          amountCents: booking.price,
          currency: 'ZAR'
        });
        const paid = await prisma.payment.findUnique({ where: { id: payment.id } });
        return res.status(201).json(mapPaymentDto(paid!));
      }

      const payment = await createPaymentIntent({
        bookingId: booking.id,
        userId: booking.customer.userId,
        customerEmail: booking.customer.user.email,
        amountCents: booking.price,
        provider,
        idempotencyKey: req.body.idempotencyKey
      });
      res.status(201).json(mapPaymentDto(payment));
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.get('/stub-checkout/:paymentId', async (req, res) => {
  res.type('html').send(`<!doctype html>
<html><body style="font-family:sans-serif;padding:2rem">
  <h1>Dripless stub checkout</h1>
  <p>Payment ${req.params.paymentId}</p>
  <form method="post" action="/payments/webhooks/stub">
    <input type="hidden" name="paymentId" value="${req.params.paymentId}" />
    <button type="submit">Mark paid (demo)</button>
  </form>
</body></html>`);
});

paymentsRouter.post('/webhooks/stub', async (req, res, next) => {
  try {
    const paymentId = String(req.body.paymentId || req.query.paymentId || '');
    if (!paymentId) throw new HttpError(400, 'paymentId required');
    const eventId = `stub_${paymentId}`;
    const { duplicate } = await recordWebhookReceipt({
      provider: 'stub',
      providerEventId: eventId,
      signatureValid: true,
      payload: req.body
    });
    if (!duplicate) {
      await applyPaymentSuccess({
        paymentId,
        providerEventId: eventId,
        payload: req.body
      });
    }
    res.json({ ok: true, duplicate });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/paystack', async (req, res, next) => {
  try {
    const raw = JSON.stringify(req.body);
    const signature = String(req.headers['x-paystack-signature'] || '');
    const valid = env.PAYSTACK_SECRET_KEY ? verifyPaystackSignature(raw, signature) : !env.isProduction;
    if (!valid) throw new HttpError(401, 'Invalid Paystack signature');

    const eventId = String(req.body?.data?.id || req.body?.data?.reference || '');
    if (!eventId) throw new HttpError(400, 'Missing event id');

    const event = String(req.body?.event || '');
    const reference = String(req.body?.data?.reference || '');
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ externalRef: reference }, { id: reference }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');

    const { duplicate } = await recordWebhookReceipt({
      provider: 'paystack',
      providerEventId: eventId,
      signatureValid: valid,
      payload: req.body
    });
    if (duplicate) return res.json({ ok: true, duplicate: true });

    await enqueue('payments.webhook', {
      provider: 'paystack',
      eventId,
      body: req.body
    });

    const amount = Number(req.body?.data?.amount);
    const currency = String(req.body?.data?.currency || 'ZAR');
    if (event.includes('success') || req.body?.data?.status === 'success') {
      await applyPaymentSuccess({
        paymentId: payment.id,
        providerEventId: eventId,
        payload: req.body,
        amountCents: Number.isFinite(amount) ? amount : undefined,
        currency
      });
    } else if (event.includes('failed') || req.body?.data?.status === 'failed') {
      await applyPaymentFailed({
        paymentId: payment.id,
        providerEventId: eventId,
        payload: req.body,
        reason: String(req.body?.data?.gateway_response || 'failed')
      });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/payfast', async (req, res, next) => {
  try {
    const body = req.body as Record<string, string>;
    if (!verifyPayfastSignature(body)) throw new HttpError(401, 'Invalid PayFast signature');
    const paymentId = String(body.m_payment_id || '');
    const eventId = String(body.pf_payment_id || paymentId);
    const { duplicate } = await recordWebhookReceipt({
      provider: 'payfast',
      providerEventId: eventId,
      signatureValid: true,
      payload: body
    });
    if (duplicate) return res.json({ ok: true, duplicate: true });
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ id: paymentId }, { externalRef: eventId }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    const amountCents = Math.round(Number(body.amount_gross || body.amount) * 100);
    await applyPaymentSuccess({
      paymentId: payment.id,
      providerEventId: eventId,
      payload: body,
      amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
      currency: 'ZAR'
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/ozow', async (req, res, next) => {
  try {
    const body = req.body as Record<string, string>;
    if (!verifyOzowSignature(body)) throw new HttpError(401, 'Invalid Ozow signature');
    const paymentId = String(body.TransactionReference || body.transactionReference || '');
    const eventId = String(body.TransactionId || paymentId);
    const { duplicate } = await recordWebhookReceipt({
      provider: 'ozow',
      providerEventId: eventId,
      signatureValid: true,
      payload: body
    });
    if (duplicate) return res.json({ ok: true, duplicate: true });
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ id: paymentId }, { externalRef: eventId }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    const amountCents = Math.round(Number(body.Amount || body.amount) * 100);
    const status = String(body.Status || body.status || '').toLowerCase();
    if (status === 'complete' || status === 'success') {
      await applyPaymentSuccess({
        paymentId: payment.id,
        providerEventId: eventId,
        payload: body,
        amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
        currency: 'ZAR'
      });
    } else {
      await applyPaymentFailed({
        paymentId: payment.id,
        providerEventId: eventId,
        payload: body,
        reason: status
      });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post(
  '/:paymentId/refunds',
  authRequired,
  roleRequired(['ops_admin', 'customer']),
  validate(
    z.object({
      amountZar: z.number().positive().optional(),
      reason: z.string().min(3).max(500),
      cancellationFeeZar: z.number().min(0).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: String(req.params.paymentId) }
      });
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (req.auth!.role === 'customer') {
        const booking = payment.bookingId
          ? await prisma.booking.findUnique({ where: { id: payment.bookingId } })
          : null;
        if (!booking || booking.customerId !== req.auth!.profileId) {
          throw new HttpError(403, 'Forbidden');
        }
      }
      const amountCents = req.body.amountZar
        ? Math.round(req.body.amountZar * 100)
        : payment.amountZar;
      const refund = await processRefund({
        paymentId: payment.id,
        amountCents,
        reason: req.body.reason,
        actorId: req.auth!.profileId,
        cancellationFeeCents: req.body.cancellationFeeZar
          ? Math.round(req.body.cancellationFeeZar * 100)
          : 0
      });
      res.status(201).json(refund);
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { customerProfile: { id: req.auth!.profileId } },
          { driverProfile: { id: req.auth!.profileId } },
          { opsProfile: { id: req.auth!.profileId } }
        ]
      }
    });
    const where = req.auth!.role === 'ops_admin' ? {} : { userId: user?.id };
    const rows = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(rows.map(mapPaymentDto));
  } catch (error) {
    next(error);
  }
});
