import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { enqueue } from '../lib/queue.js';
import { verifyPaystackTransaction } from './paystack.js';
import { ozowAmountMatches, ozowStatusIsPaid } from './ozow.js';
import { applyPayoutEvent } from '../payouts/routes.js';
import {
  applyChargeback,
  applyPaymentFailed,
  applyPaymentSuccess,
  claimWebhookReceipt,
  completeWalletPayment,
  completeWebhookReceipt,
  createPaymentIntent,
  failWebhookReceipt,
  finalizeRefund,
  mapPaymentDto,
  processRefund,
  verifyOzowSignature,
  verifyPayfastSignature,
  verifyPaystackSignature
} from './service.js';

export const paymentsRouter = Router();

async function processClaimedWebhook(
  claim: { duplicate: boolean; receiptId: string },
  work: () => Promise<void>
) {
  if (claim.duplicate) return true;
  try {
    await work();
    await completeWebhookReceipt(claim.receiptId);
    return false;
  } catch (error) {
    await failWebhookReceipt(claim.receiptId, error).catch(() => undefined);
    throw error;
  }
}

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
          idempotencyKey: req.body.idempotencyKey,
          customerName: booking.customer.name
        });
        const paid = await completeWalletPayment({
          paymentId: payment.id,
          userId: booking.customer.userId,
          bookingId: booking.id,
          amountCents: booking.price
        });
        return res.status(201).json(mapPaymentDto(paid));
      }

      const payment = await createPaymentIntent({
        bookingId: booking.id,
        userId: booking.customer.userId,
        customerEmail: booking.customer.user.email,
        amountCents: booking.price,
        provider,
        idempotencyKey: req.body.idempotencyKey,
        customerName: booking.customer.name
      });
      res.status(201).json(mapPaymentDto(payment));
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.get('/stub-checkout/:paymentId', async (req, res) => {
  if (env.isProduction) return res.status(404).send('Not found');
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
    if (env.isProduction) throw new HttpError(404, 'Not found');
    const paymentId = String(req.body.paymentId || req.query.paymentId || '');
    if (!paymentId) throw new HttpError(400, 'paymentId required');
    const eventId = `stub_${paymentId}`;
    const claim = await claimWebhookReceipt({
      provider: 'stub',
      providerEventId: eventId,
      signatureValid: true,
      payload: req.rawBody || req.body,
      eventType: 'payment.success',
      paymentId
    });
    const duplicate = await processClaimedWebhook(claim, async () => {
      await applyPaymentSuccess({
        paymentId,
        providerEventId: eventId,
        payload: req.body
      });
    });
    res.json({ ok: true, duplicate });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/paystack', async (req, res, next) => {
  try {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const signature = String(req.headers['x-paystack-signature'] || '');
    const valid = env.PAYSTACK_SECRET_KEY ? verifyPaystackSignature(raw, signature) : !env.isProduction;
    if (!valid) throw new HttpError(401, 'Invalid Paystack signature');

    const event = String(req.body?.event || '');
    const providerObjectId = String(
      req.body?.data?.id || req.body?.data?.reference || req.body?.data?.refund_reference || ''
    );
    if (!event || !providerObjectId) throw new HttpError(400, 'Missing event id or type');
    const eventId = `${event}:${providerObjectId}`;
    const reference = String(
      req.body?.data?.reference ||
      req.body?.data?.transaction?.reference ||
      req.body?.data?.transaction_reference ||
      ''
    );
    if (event.startsWith('transfer.')) {
      const claim = await claimWebhookReceipt({
        provider: 'paystack',
        providerEventId: eventId,
        signatureValid: valid,
        payload: raw,
        eventType: event
      });
      const duplicate = await processClaimedWebhook(claim, async () => {
        await applyPayoutEvent({
          reference,
          transferCode: String(req.body?.data?.transfer_code || providerObjectId),
          status: event === 'transfer.success' ? 'PAID' : 'FAILED'
        });
      });
      return res.json({ ok: true, duplicate });
    }
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ externalRef: reference }, { id: reference }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');

    const claim = await claimWebhookReceipt({
      provider: 'paystack',
      providerEventId: eventId,
      signatureValid: valid,
      payload: raw,
      eventType: event,
      paymentId: payment.id
    });
    const duplicate = await processClaimedWebhook(claim, async () => {
      await enqueue('payments.webhook', {
        provider: 'paystack',
        eventId,
        body: req.body
      });

      const amount = Number(req.body?.data?.amount);
      const currency = String(req.body?.data?.currency || 'ZAR');
      if (event === 'charge.success') {
        const verified = env.PAYSTACK_SECRET_KEY
          ? await verifyPaystackTransaction(reference)
          : {
              status: req.body?.data?.status,
              amount,
              currency,
              reference,
              id: req.body?.data?.id
            };
        if (!verified || verified.status !== 'success' || verified.reference !== reference) {
          throw new HttpError(400, 'Paystack transaction verification failed');
        }
        await applyPaymentSuccess({
          paymentId: payment.id,
          providerEventId: eventId,
          payload: req.body,
          amountCents: verified.amount,
          currency: verified.currency
        });
      } else if (event.includes('failed') || req.body?.data?.status === 'failed') {
        await applyPaymentFailed({
          paymentId: payment.id,
          providerEventId: eventId,
          payload: req.body,
          reason: String(req.body?.data?.gateway_response || 'failed')
        });
      } else if (event === 'refund.processed') {
        const amountCents = Number(req.body?.data?.amount);
        const refund = await prisma.refund.findFirst({
          where: {
            paymentId: payment.id,
            status: 'PROCESSING',
            ...(Number.isFinite(amountCents) ? { amountCents } : {})
          },
          orderBy: { createdAt: 'asc' }
        });
        if (!refund) throw new HttpError(404, 'Refund not found');
        await finalizeRefund(refund.id);
      } else if (event === 'refund.failed') {
        const refund = await prisma.refund.findFirst({
          where: { paymentId: payment.id, status: 'PROCESSING' },
          orderBy: { createdAt: 'asc' }
        });
        if (!refund) throw new HttpError(404, 'Refund not found');
        await prisma.refund.update({ where: { id: refund.id }, data: { status: 'FAILED' } });
      } else if (event.startsWith('charge.dispute.')) {
        const eventStatus = String(req.body?.data?.status || '').toLowerCase();
        const status = event.endsWith('.resolve')
          ? eventStatus === 'resolved' || eventStatus === 'won'
            ? 'WON'
            : 'LOST'
          : 'OPEN';
        await applyChargeback({
          paymentId: payment.id,
          providerEventId: eventId,
          externalRef: String(req.body?.data?.id || ''),
          amountCents: Number(req.body?.data?.amount || payment.amountZar),
          reason: String(req.body?.data?.reason || req.body?.data?.message || event),
          status
        });
      }
    });
    res.json({ ok: true, duplicate });
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
    const claim = await claimWebhookReceipt({
      provider: 'payfast',
      providerEventId: eventId,
      signatureValid: true,
      payload: req.rawBody || body,
      eventType: String(body.payment_status || 'payment'),
      paymentId
    });
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ id: paymentId }, { externalRef: eventId }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    const amountCents = Math.round(Number(body.amount_gross || body.amount) * 100);
    const duplicate = await processClaimedWebhook(claim, async () => {
      await applyPaymentSuccess({
        paymentId: payment.id,
        providerEventId: eventId,
        payload: body,
        amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
        currency: 'ZAR'
      });
    });
    res.json({ ok: true, duplicate });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/ozow', async (req, res, next) => {
  try {
    const body = req.body as Record<string, string>;
    if (!verifyOzowSignature(body)) throw new HttpError(401, 'Invalid Ozow signature');
    const paymentId = String(body.TransactionReference || body.transactionReference || '');
    const eventId = String(body.TransactionId || body.transactionId || paymentId);
    const claim = await claimWebhookReceipt({
      provider: 'ozow',
      providerEventId: eventId,
      signatureValid: true,
      payload: req.rawBody || body,
      eventType: String(body.Status || body.status || 'payment'),
      paymentId
    });
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { externalRef: eventId },
          { externalRef: paymentId }
        ]
      }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    const currency = String(body.CurrencyCode || body.currencyCode || 'ZAR');
    if (!ozowAmountMatches(payment.amountZar, body.Amount || body.amount || '', currency)) {
      throw new HttpError(400, 'Amount mismatch');
    }
    const amountCents = Math.round(Number(body.Amount || body.amount) * 100);
    const status = String(body.Status || body.status || '');
    const duplicate = await processClaimedWebhook(claim, async () => {
      if (ozowStatusIsPaid(status)) {
        await applyPaymentSuccess({
          paymentId: payment.id,
          providerEventId: eventId,
          payload: body,
          amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
          currency
        });
      } else {
        await applyPaymentFailed({
          paymentId: payment.id,
          providerEventId: eventId,
          payload: body,
          reason: status || String(body.StatusMessage || 'ozow_failed')
        });
      }
    });
    // Ozow expects a simple 200 acknowledgement for notify callbacks.
    res.status(200).type('text/plain').send(duplicate ? 'OK' : 'OK');
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post(
  '/:paymentId/refunds',
  authRequired,
  roleRequired(['ops_admin']),
  validate(
    z.object({
      amountZar: z.number().positive().optional(),
      reason: z.string().min(3).max(500),
      cancellationFeeZar: z.number().min(0).optional(),
      idempotencyKey: z.string().min(8).max(100).optional(),
      approvalId: z.string().min(1)
    })
  ),
  async (req, res, next) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: String(req.params.paymentId) }
      });
      if (!payment) throw new HttpError(404, 'Payment not found');
      const idempotencyKey = String(
        req.body.idempotencyKey || req.headers['idempotency-key'] || ''
      );
      if (idempotencyKey.length < 8) throw new HttpError(400, 'Idempotency-Key is required');
      const amountCents = req.body.amountZar
        ? Math.round(req.body.amountZar * 100)
        : payment.amountZar;
      const approval = await prisma.highRiskApproval.findUnique({ where: { id: req.body.approvalId } });
      const payload = (approval?.payload || {}) as Record<string, unknown>;
      if (
        !approval ||
        approval.status !== 'APPROVED' ||
        approval.action !== 'PAYMENT_REFUND' ||
        String(payload.paymentId || '') !== payment.id ||
        Number(payload.maxAmountCents || 0) < amountCents
      ) {
        throw new HttpError(403, 'Approved refund authorisation is required');
      }
      const claimed = await prisma.highRiskApproval.updateMany({
        where: { id: approval.id, status: 'APPROVED' },
        data: { status: 'CONSUMING' }
      });
      if (claimed.count !== 1) throw new HttpError(409, 'Refund approval was already consumed');
      let refund;
      try {
        refund = await processRefund({
          paymentId: payment.id,
          amountCents,
          reason: req.body.reason,
          actorId: req.auth!.profileId,
          cancellationFeeCents: req.body.cancellationFeeZar
            ? Math.round(req.body.cancellationFeeZar * 100)
            : 0,
          idempotencyKey
        });
        await prisma.highRiskApproval.update({
          where: { id: approval.id },
          data: { status: 'CONSUMED' }
        });
      } catch (error) {
        await prisma.highRiskApproval.updateMany({
          where: { id: approval.id, status: 'CONSUMING' },
          data: { status: 'APPROVED' }
        });
        throw error;
      }
      res.status(201).json(refund);
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.get('/refunds', authRequired, async (req, res, next) => {
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
    const rows = await prisma.refund.findMany({
      where: req.auth!.role === 'ops_admin' ? {} : { payment: { userId: user?.id } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get('/disputes', authRequired, async (req, res, next) => {
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
    const rows = await prisma.chargeback.findMany({
      where: req.auth!.role === 'ops_admin' ? {} : { payment: { userId: user?.id } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

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
