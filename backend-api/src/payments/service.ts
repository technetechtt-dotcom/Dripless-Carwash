import { createHash } from 'node:crypto';
import type { PaymentProvider } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';
import { publishEvent } from '../lib/events.js';
import { enqueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { creditWallet } from '../wallet/ledger.js';
import { initializePaystack, refundPaystack, verifyPaystackSignature } from './paystack.js';

export function payloadHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function createPaymentIntent(input: {
  bookingId: string;
  userId: string;
  customerEmail: string;
  amountCents: number;
  provider?: PaymentProvider;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) return existing;
  }

  const provider = input.provider || env.PAYMENTS_PROVIDER;
  const payment = await prisma.payment.create({
    data: {
      bookingId: input.bookingId,
      userId: input.userId,
      provider,
      amountZar: input.amountCents,
      currency: 'ZAR',
      status: 'REQUIRES_ACTION',
      idempotencyKey: input.idempotencyKey,
      metadata: { email: input.customerEmail }
    }
  });

  let checkoutUrl = `http://localhost:${env.PORT}/payments/stub-checkout/${payment.id}`;
  let externalRef = `stub_${payment.id}`;

  if (provider === 'paystack' && env.PAYSTACK_SECRET_KEY) {
    const init = await initializePaystack({
      paymentId: payment.id,
      email: input.customerEmail,
      amountCents: input.amountCents,
      currency: 'ZAR'
    });
    checkoutUrl = init.checkoutUrl;
    externalRef = init.externalRef;
  } else if (provider === 'payfast' && env.PAYFAST_MERCHANT_ID) {
    checkoutUrl = `https://sandbox.payfast.co.za/eng/process?m_payment_id=${payment.id}&amount=${fromCents(input.amountCents)}`;
    externalRef = `pf_${payment.id}`;
  } else if (provider === 'ozow' && env.OZOW_SITE_CODE) {
    checkoutUrl = `https://pay.ozow.com/?siteCode=${env.OZOW_SITE_CODE}&transactionReference=${payment.id}`;
    externalRef = `oz_${payment.id}`;
  } else if (provider === 'wallet') {
    checkoutUrl = null as unknown as string;
    externalRef = `wallet_${payment.id}`;
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: { checkoutUrl, externalRef }
  });
}

export async function recordWebhookReceipt(input: {
  provider: PaymentProvider;
  providerEventId: string;
  signatureValid: boolean;
  payload: unknown;
}): Promise<{ duplicate: boolean }> {
  try {
    await prisma.webhookReceipt.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        signatureValid: input.signatureValid,
        payloadHash: payloadHash(input.payload)
      }
    });
    return { duplicate: false };
  } catch {
    return { duplicate: true };
  }
}

export async function applyPaymentSuccess(input: {
  paymentId: string;
  providerEventId: string;
  payload: unknown;
  amountCents?: number;
  currency?: string;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new HttpError(404, 'Payment not found');

  if (input.currency && input.currency !== payment.currency) {
    throw new HttpError(400, 'Currency mismatch');
  }
  if (input.amountCents != null && input.amountCents !== payment.amountZar) {
    throw new HttpError(400, 'Amount mismatch');
  }

  if (payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED') {
    return payment;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.paymentEvent
      .create({
        data: {
          paymentId: payment.id,
          providerEventId: input.providerEventId,
          eventType: 'payment.success',
          payload: input.payload as object
        }
      })
      .catch(() => undefined);

    const row = await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date(), failureReason: null }
    });
    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'PAID' }
      });
    }
    return row;
  });

  publishEvent('payment.status', {
    paymentId: updated.id,
    bookingId: updated.bookingId,
    status: updated.status
  });
  await enqueue('invoice.issue', { paymentId: updated.id }).catch(() => undefined);
  await enqueue('notification.push', {
    userId: updated.userId,
    template: 'payment.paid',
    title: 'Payment received',
    message: 'Your Dripless payment was successful.'
  }).catch(() => undefined);
  return updated;
}

export async function applyPaymentFailed(input: {
  paymentId: string;
  providerEventId: string;
  payload: unknown;
  reason?: string;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (payment.status === 'PAID') return payment;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason: input.reason || 'provider_failed',
      retryCount: { increment: 1 }
    }
  });
  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      providerEventId: input.providerEventId,
      eventType: 'payment.failed',
      payload: input.payload as object
    }
  }).catch(() => undefined);
  if (payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: 'FAILED' }
    });
  }
  publishEvent('payment.status', {
    paymentId: updated.id,
    bookingId: updated.bookingId,
    status: 'FAILED'
  });
  await enqueue('payment.retry', { paymentId: payment.id }, {
    runAt: new Date(Date.now() + Math.min(30 * 60_000, 2 ** updated.retryCount * 5000))
  }).catch(() => undefined);
  return updated;
}

export function verifyPayfastSignature(body: Record<string, string>): boolean {
  if (!env.PAYFAST_PASSPHRASE && !env.PAYFAST_MERCHANT_KEY) return !env.isProduction;
  const pfParamString = Object.keys(body)
    .filter((k) => k !== 'signature' && body[k] !== '')
    .sort()
    .map((k) => `${k}=${encodeURIComponent(body[k]).replace(/%20/g, '+')}`)
    .join('&');
  const withPass = env.PAYFAST_PASSPHRASE
    ? `${pfParamString}&passphrase=${encodeURIComponent(env.PAYFAST_PASSPHRASE)}`
    : pfParamString;
  const hash = createHash('md5').update(withPass).digest('hex');
  return hash === String(body.signature || '');
}

export function verifyOzowSignature(body: Record<string, string>): boolean {
  if (!env.OZOW_PRIVATE_KEY) return !env.isProduction;
  const concat = [
    body.SiteCode || body.siteCode || '',
    body.TransactionId || '',
    body.TransactionReference || body.transactionReference || '',
    body.Amount || '',
    body.Status || '',
    env.OZOW_PRIVATE_KEY
  ].join('');
  const hash = createHash('sha512').update(concat).digest('hex');
  return hash.toLowerCase() === String(body.Hash || body.hash || '').toLowerCase();
}

export { verifyPaystackSignature };

export async function processRefund(input: {
  paymentId: string;
  amountCents: number;
  reason: string;
  actorId?: string;
  cancellationFeeCents?: number;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { refunds: true }
  });
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (!['PAID', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
    throw new HttpError(400, 'Payment is not refundable');
  }
  const already = payment.refunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + r.amountCents, 0);
  const fee = input.cancellationFeeCents ?? 0;
  const net = input.amountCents - fee;
  if (net <= 0) throw new HttpError(400, 'Refund after cancellation fee is zero');
  if (already + net > payment.amountZar) {
    throw new HttpError(400, 'Refund exceeds captured amount');
  }

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amountCents: net,
      cancellationFeeCents: fee,
      reason: input.reason,
      status: 'PROCESSING',
      approvedById: input.actorId
    }
  });

  let externalRef: string | undefined;
  if (payment.provider === 'paystack') {
    const result = (await refundPaystack(payment.externalRef || payment.id, net)) as {
      status?: boolean;
      message?: string;
      data?: { id?: string | number };
    };
    if (result.status === false) {
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED' }
      });
      throw new HttpError(502, result.message || 'Paystack refund failed');
    }
    externalRef = String(result.data?.id || '');
  }

  const completed = already + net;
  const nextStatus = completed >= payment.amountZar ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: { status: 'COMPLETED', processedAt: new Date(), externalRef }
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: nextStatus }
    });
    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: nextStatus }
      });
    }
  });

  await creditWallet({
    userId: payment.userId,
    amountCents: net,
    type: 'REFUND',
    reference: refund.id,
    bookingId: payment.bookingId,
    paymentId: payment.id,
    note: input.reason
  });

  publishEvent('payment.status', {
    paymentId: payment.id,
    status: nextStatus,
    refundId: refund.id
  });
  return prisma.refund.findUnique({ where: { id: refund.id } });
}

export function mapPaymentDto(row: {
  id: string;
  bookingId: string | null;
  provider: string;
  amountZar: number;
  currency: string;
  status: string;
  checkoutUrl: string | null;
  externalRef: string | null;
  createdAt: Date;
}) {
  return {
    paymentId: row.id,
    bookingId: row.bookingId,
    provider: row.provider,
    amountZar: fromCents(row.amountZar),
    amountCents: row.amountZar,
    currency: row.currency,
    status: row.status,
    checkoutUrl: row.checkoutUrl,
    externalRef: row.externalRef,
    createdAt: row.createdAt.toISOString()
  };
}

export async function reconcilePayments() {
  const pending = await prisma.payment.findMany({
    where: { status: { in: ['PENDING', 'REQUIRES_ACTION', 'FAILED'] } },
    take: 50,
    orderBy: { createdAt: 'asc' }
  });
  logger.info('payment_reconciliation_scan', { count: pending.length });
  return { scanned: pending.length };
}
