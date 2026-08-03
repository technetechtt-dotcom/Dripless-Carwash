import { Router } from 'express';
import { createHmac, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

export const paymentsRouter = Router();

async function buildCheckout(provider: 'stub' | 'paystack' | 'payfast' | 'ozow', paymentId: string, amountZar: number) {
  if (provider === 'paystack' && env.PAYSTACK_SECRET_KEY) {
    return {
      checkoutUrl: `https://checkout.paystack.com/#stub-${paymentId}`,
      externalRef: `psk_${paymentId}`
    };
  }
  if (provider === 'payfast' && env.PAYFAST_MERCHANT_ID) {
    return {
      checkoutUrl: `https://sandbox.payfast.co.za/eng/process?m_payment_id=${paymentId}&amount=${amountZar}`,
      externalRef: `pf_${paymentId}`
    };
  }
  if (provider === 'ozow' && env.OZOW_SITE_CODE) {
    return {
      checkoutUrl: `https://pay.ozow.com/?siteCode=${env.OZOW_SITE_CODE}&transactionReference=${paymentId}`,
      externalRef: `oz_${paymentId}`
    };
  }
  return {
    checkoutUrl: `http://localhost:${env.PORT}/payments/stub-checkout/${paymentId}`,
    externalRef: `stub_${paymentId}`
  };
}

paymentsRouter.post(
  '/intent',
  authRequired,
  roleRequired(['customer', 'ops_admin']),
  validate(
    z
      .object({
        bookingId: z.string().min(1),
        provider: z.enum(['stub', 'paystack', 'payfast', 'ozow']).optional()
      })
  ),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: req.body.bookingId } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
        throw new HttpError(403, 'Forbidden');
      }
      if (booking.paymentStatus === 'PAID') {
        throw new HttpError(400, 'Booking already paid');
      }

      const customer = await prisma.customerProfile.findUnique({
        where: { id: booking.customerId }
      });
      if (!customer) throw new HttpError(404, 'Customer missing');

      const provider = req.body.provider || env.PAYMENTS_PROVIDER;
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: customer.userId,
          provider,
          amountZar: booking.price,
          status: 'REQUIRES_ACTION',
          metadata: { createdBy: req.auth!.profileId }
        }
      });
      const checkout = await buildCheckout(provider, payment.id, booking.price);
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutUrl: checkout.checkoutUrl,
          externalRef: checkout.externalRef
        }
      });
      res.status(201).json({
        paymentId: updated.id,
        provider: updated.provider,
        amountZar: updated.amountZar,
        currency: updated.currency,
        status: updated.status,
        checkoutUrl: updated.checkoutUrl,
        externalRef: updated.externalRef
      });
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

async function markPaid(paymentId: string, providerEventId: string, payload: unknown) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'Payment not found');

  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.create({
      data: {
        paymentId,
        providerEventId,
        eventType: 'payment.success',
        payload: payload as object
      }
    }).catch(() => undefined);

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID' }
    });
    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'PAID' }
      });
    }
  });
}

paymentsRouter.post('/webhooks/stub', async (req, res, next) => {
  try {
    const paymentId = String(req.body.paymentId || req.query.paymentId || '');
    if (!paymentId) throw new HttpError(400, 'paymentId required');
    await markPaid(paymentId, `stub_${randomUUID()}`, req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/paystack', async (req, res, next) => {
  try {
    if (env.PAYSTACK_SECRET_KEY) {
      const signature = String(req.headers['x-paystack-signature'] || '');
      const hash = createHmac('sha512', env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (signature && signature !== hash) {
        throw new HttpError(401, 'Invalid Paystack signature');
      }
    }
    const reference = String(req.body?.data?.reference || '');
    const payment = await prisma.payment.findFirst({
      where: { OR: [{ externalRef: reference }, { id: reference.replace(/^psk_/, '') }] }
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    await markPaid(payment.id, String(req.body?.data?.id || randomUUID()), req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/payfast', async (req, res, next) => {
  try {
    const paymentId = String(req.body.m_payment_id || '');
    if (!paymentId) throw new HttpError(400, 'm_payment_id required');
    await markPaid(paymentId, String(req.body.pf_payment_id || randomUUID()), req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/webhooks/ozow', async (req, res, next) => {
  try {
    const paymentId = String(req.body.TransactionReference || req.body.transactionReference || '');
    if (!paymentId) throw new HttpError(400, 'TransactionReference required');
    await markPaid(paymentId, String(req.body.TransactionId || randomUUID()), req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
