import { createHash } from 'node:crypto';
import { Prisma, type Payment, type PaymentProvider, type Refund } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';
import { publishEvent } from '../lib/events.js';
import { enqueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { sendOperationalAlert } from '../lib/monitoring.js';
import { applyWalletEntry, creditWallet, reconcileWallets } from '../wallet/ledger.js';
import {
  initializePaystack,
  listPaystackSettlements,
  refundPaystack,
  verifyPaystackSignature,
  verifyPaystackTransaction
} from './paystack.js';
import {
  initializeOzow,
  verifyOzowNotifySignature
} from './ozow.js';

export function payloadHash(payload: unknown): string {
  const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  return createHash('sha256').update(bytes).digest('hex');
}

export async function createPaymentIntent(input: {
  bookingId: string;
  userId: string;
  customerEmail: string;
  amountCents: number;
  provider?: PaymentProvider;
  idempotencyKey?: string;
  customerName?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) {
      const requestedProvider = input.provider || env.PAYMENTS_PROVIDER;
      if (
        existing.bookingId !== input.bookingId ||
        existing.userId !== input.userId ||
        existing.amountZar !== input.amountCents ||
        existing.provider !== requestedProvider
      ) {
        throw new HttpError(409, 'Payment idempotency key was reused with different parameters');
      }
      return existing;
    }
  }

  const provider = input.provider || env.PAYMENTS_PROVIDER;
  if (
    env.isProduction &&
    provider !== 'paystack' &&
    provider !== 'ozow' &&
    provider !== 'wallet'
  ) {
    throw new HttpError(400, 'Only Ozow, Paystack, and wallet payments are enabled in production');
  }
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

  if (provider === 'paystack') {
    const init = await initializePaystack({
      paymentId: payment.id,
      email: input.customerEmail,
      amountCents: input.amountCents,
      currency: 'ZAR'
    });
    checkoutUrl = init.checkoutUrl;
    externalRef = init.externalRef;
  } else if (provider === 'payfast') {
    if (!env.PAYFAST_MERCHANT_ID) throw new HttpError(503, 'PayFast is not configured');
    checkoutUrl = `https://sandbox.payfast.co.za/eng/process?m_payment_id=${payment.id}&amount=${fromCents(input.amountCents)}`;
    externalRef = `pf_${payment.id}`;
  } else if (provider === 'ozow') {
    const init = await initializeOzow({
      paymentId: payment.id,
      amountCents: input.amountCents,
      customerName: input.customerName
    });
    checkoutUrl = init.checkoutUrl;
    externalRef = init.externalRef;
  } else if (provider === 'wallet') {
    checkoutUrl = null as unknown as string;
    externalRef = `wallet_${payment.id}`;
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: { checkoutUrl, externalRef }
  });
}

export async function claimWebhookReceipt(input: {
  provider: PaymentProvider;
  providerEventId: string;
  signatureValid: boolean;
  payload: unknown;
  eventType?: string;
  paymentId?: string;
}): Promise<{ duplicate: boolean; receiptId: string }> {
  const hash = payloadHash(input.payload);
  try {
    const receipt = await prisma.webhookReceipt.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        signatureValid: input.signatureValid,
        payloadHash: hash,
        eventType: input.eventType,
        paymentId: input.paymentId,
        status: 'PROCESSING'
      }
    });
    return { duplicate: false, receiptId: receipt.id };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
    const existing = await prisma.webhookReceipt.findUnique({
      where: {
        provider_providerEventId: {
          provider: input.provider,
          providerEventId: input.providerEventId
        }
      }
    });
    if (!existing) throw error;
    if (existing.payloadHash !== hash) {
      throw new HttpError(409, 'Webhook event id was replayed with a different payload');
    }
    const stale = existing.status === 'PROCESSING' &&
      existing.processedAt < new Date(Date.now() - 5 * 60_000);
    if (existing.status === 'FAILED' || stale) {
      const retried = await prisma.webhookReceipt.update({
        where: { id: existing.id },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          lastError: null,
          processedAt: new Date(),
          eventType: input.eventType,
          paymentId: input.paymentId
        }
      });
      return { duplicate: false, receiptId: retried.id };
    }
    return { duplicate: true, receiptId: existing.id };
  }
}

export async function completeWebhookReceipt(receiptId: string) {
  await prisma.webhookReceipt.update({
    where: { id: receiptId },
    data: { status: 'PROCESSED', completedAt: new Date(), lastError: null }
  });
}

export async function failWebhookReceipt(receiptId: string, error: unknown) {
  await prisma.webhookReceipt.update({
    where: { id: receiptId },
    data: {
      status: 'FAILED',
      lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000)
    }
  });
}

export async function applyPaymentSuccess(input: {
  paymentId: string;
  providerEventId: string;
  payload: unknown;
  amountCents?: number;
  currency?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
    if (!payment) throw new HttpError(404, 'Payment not found');
    if (input.currency && input.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      throw new HttpError(400, 'Currency mismatch');
    }
    if (input.amountCents != null && input.amountCents !== payment.amountZar) {
      throw new HttpError(400, 'Amount mismatch');
    }
    const priorEvent = await tx.paymentEvent.findUnique({
      where: {
        paymentId_providerEventId: {
          paymentId: payment.id,
          providerEventId: input.providerEventId
        }
      }
    });
    if (priorEvent) return { row: payment, changed: false };
    await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          providerEventId: input.providerEventId,
          eventType: 'payment.success',
          payload: input.payload as object
        }
      });
    const claimed = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'FAILED'] }
      },
      data: { status: 'PAID', paidAt: new Date(), failureReason: null }
    });
    if (claimed.count && payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'PAID' }
      });
    }
    const row = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return { row, changed: claimed.count === 1 };
  });

  const updated = result.row;
  if (!result.changed) return updated;
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
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
    if (!payment) throw new HttpError(404, 'Payment not found');
    const priorEvent = await tx.paymentEvent.findUnique({
      where: { paymentId_providerEventId: { paymentId: payment.id, providerEventId: input.providerEventId } }
    });
    if (priorEvent) return { row: payment, changed: false };
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: input.providerEventId,
        eventType: 'payment.failed',
        payload: input.payload as object
      }
    });
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'FAILED'] } },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: input.reason || 'provider_failed',
        retryCount: { increment: 1 }
      }
    });
    if (claimed.count && payment.bookingId) {
      await tx.booking.update({ where: { id: payment.bookingId }, data: { paymentStatus: 'FAILED' } });
    }
    return {
      row: await tx.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      changed: claimed.count === 1
    };
  });
  const updated = result.row;
  if (!result.changed) return updated;
  publishEvent('payment.status', {
    paymentId: updated.id,
    bookingId: updated.bookingId,
    status: 'FAILED'
  });
  await enqueue('payment.retry', { paymentId: updated.id }, {
    runAt: new Date(Date.now() + Math.min(30 * 60_000, 2 ** updated.retryCount * 5000))
  }).catch(() => undefined);
  await sendOperationalAlert('payment_failure', 'Payment provider reported a failed payment', {
    paymentId: updated.id,
    bookingId: updated.bookingId,
    reason: updated.failureReason
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
  return verifyOzowNotifySignature(body);
}

export { verifyPaystackSignature };

export async function processRefund(input: {
  paymentId: string;
  amountCents: number;
  reason: string;
  actorId?: string;
  cancellationFeeCents?: number;
  idempotencyKey: string;
}) {
  const fee = input.cancellationFeeCents ?? 0;
  const net = input.amountCents - fee;
  if (net <= 0) throw new HttpError(400, 'Refund after cancellation fee is zero');
  let reserved: { payment: Payment; refund: Refund; existing: boolean } | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      reserved = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
        if (!['PAID', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
          throw new HttpError(400, 'Payment is not refundable');
        }
        const existing = await tx.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          if (existing.paymentId !== payment.id || existing.amountCents !== net) {
            throw new HttpError(409, 'Refund idempotency key was reused with different parameters');
          }
          return { payment, refund: existing, existing: true };
        }
        const aggregate = await tx.refund.aggregate({
          where: { paymentId: payment.id, status: { in: ['PROCESSING', 'COMPLETED'] } },
          _sum: { amountCents: true }
        });
        if ((aggregate._sum.amountCents || 0) + net > payment.amountZar) {
          throw new HttpError(400, 'Refund exceeds captured amount');
        }
        const refund = await tx.refund.create({
          data: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            amountCents: net,
            cancellationFeeCents: fee,
            reason: input.reason,
            status: 'PROCESSING',
            approvedById: input.actorId,
            idempotencyKey: input.idempotencyKey,
            destination: payment.provider === 'wallet' ? 'WALLET' : 'PROVIDER'
          }
        });
        return { payment, refund, existing: false };
      }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  if (!reserved) throw new Error('Could not reserve refund');
  const { payment, refund } = reserved;
  if (reserved.existing) return refund;

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
    await prisma.refund.update({ where: { id: refund.id }, data: { externalRef } });
    return prisma.refund.findUnique({ where: { id: refund.id } });
  } else if (payment.provider === 'payfast' || payment.provider === 'ozow') {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: 'FAILED' } });
    throw new HttpError(501, `${payment.provider} refunds are not enabled; Paystack is the production provider`);
  }
  return finalizeRefund(refund.id);
}

export async function finalizeRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { payment: { include: { refunds: true } } }
  });
  if (!refund) throw new HttpError(404, 'Refund not found');
  if (refund.status === 'COMPLETED') {
    if (refund.payment.provider === 'wallet') {
      await creditWallet({
        userId: refund.payment.userId,
        amountCents: refund.amountCents,
        type: 'REFUND',
        reference: refund.id,
        idempotencyKey: `refund-wallet:${refund.id}`,
        bookingId: refund.bookingId,
        paymentId: refund.paymentId,
        note: refund.reason
      });
    }
    return refund;
  }
  const nextStatus = await prisma.$transaction(async (tx) => {
    await tx.refund.updateMany({
      where: { id: refund.id, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', processedAt: new Date() }
    });
    const aggregate = await tx.refund.aggregate({
      where: { paymentId: refund.paymentId, status: 'COMPLETED' },
      _sum: { amountCents: true }
    });
    const status = (aggregate._sum.amountCents || 0) >= refund.payment.amountZar
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';
    await tx.payment.update({ where: { id: refund.paymentId }, data: { status } });
    if (refund.bookingId) {
      await tx.booking.update({ where: { id: refund.bookingId }, data: { paymentStatus: status } });
    }
    return status;
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 });
  if (refund.payment.provider === 'wallet') {
    await creditWallet({
      userId: refund.payment.userId,
      amountCents: refund.amountCents,
      type: 'REFUND',
      reference: refund.id,
      idempotencyKey: `refund-wallet:${refund.id}`,
      bookingId: refund.bookingId,
      paymentId: refund.paymentId,
      note: refund.reason
    });
  }
  publishEvent('payment.status', { paymentId: refund.paymentId, status: nextStatus, refundId: refund.id });
  return prisma.refund.findUnique({ where: { id: refund.id } });
}

export async function applyChargeback(input: {
  paymentId: string;
  providerEventId: string;
  externalRef?: string;
  amountCents: number;
  reason: string;
  status: 'OPEN' | 'WON' | 'LOST';
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (input.amountCents <= 0 || input.amountCents > payment.amountZar) {
    throw new HttpError(400, 'Invalid dispute amount');
  }
  const existing = await prisma.chargeback.findFirst({
    where: {
      OR: [
        { providerEventId: input.providerEventId },
        ...(input.externalRef ? [{ externalRef: input.externalRef }] : [])
      ]
    }
  });
  const chargeback = existing
    ? await prisma.chargeback.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      reason: input.reason,
      resolvedAt: input.status === 'OPEN' ? null : new Date()
    }
  })
    : await prisma.chargeback.create({
    data: {
      paymentId: payment.id,
      providerEventId: input.providerEventId,
      externalRef: input.externalRef,
      amountCents: input.amountCents,
      reason: input.reason,
      status: input.status,
      resolvedAt: input.status === 'OPEN' ? null : new Date()
    }
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: input.status === 'WON' ? 'PAID' : 'DISPUTED' }
  });
  if (payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: input.status === 'WON' ? 'PAID' : 'DISPUTED' }
    });
    if (input.status === 'OPEN') {
      await prisma.incident.create({
        data: {
          bookingId: payment.bookingId,
          severity: 'high',
          reason: `Payment dispute opened: ${input.reason}`
        }
      });
    }
  }
  publishEvent('payment.status', { paymentId: payment.id, status: input.status === 'WON' ? 'PAID' : 'DISPUTED' });
  return chargeback;
}

export async function completeWalletPayment(input: {
  paymentId: string;
  userId: string;
  bookingId: string;
  amountCents: number;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
    if (payment.status === 'PAID') return payment;
    await applyWalletEntry(tx, {
      userId: input.userId,
      amountCents: input.amountCents,
      type: 'PAYMENT',
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      idempotencyKey: `wallet-payment:${input.paymentId}`,
      note: 'Booking payment'
    });
    await tx.paymentEvent.create({
      data: {
        paymentId: input.paymentId,
        providerEventId: `wallet_${input.paymentId}`,
        eventType: 'payment.success',
        payload: { source: 'wallet' }
      }
    });
    await tx.booking.update({ where: { id: input.bookingId }, data: { paymentStatus: 'PAID' } });
    return tx.payment.update({
      where: { id: input.paymentId },
      data: { status: 'PAID', paidAt: new Date(), failureReason: null }
    });
  }, { isolationLevel: 'Serializable' });
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
  const run = await prisma.paymentReconciliationRun.create({
    data: { provider: 'paystack' }
  });
  try {
    const candidates = await prisma.payment.findMany({
      where: { provider: 'paystack', externalRef: { not: null } },
      take: 500,
      orderBy: { createdAt: 'desc' }
    });
    let matched = 0;
    let mismatched = 0;
    let missingProvider = 0;
    for (const payment of candidates) {
      const provider = await verifyPaystackTransaction(payment.externalRef!);
      if (!provider) {
        missingProvider += 1;
        await prisma.paymentReconciliationItem.create({
          data: {
            runId: run.id,
            paymentId: payment.id,
            externalRef: payment.externalRef,
            expectedCents: payment.amountZar,
            expectedStatus: payment.status,
            result: 'MISSING_PROVIDER'
          }
        });
        continue;
      }
      const amountMatches = provider.amount === payment.amountZar;
      const currencyMatches = String(provider.currency || '').toUpperCase() === payment.currency;
      const providerPaid = provider.status === 'success';
      const localPaid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status);
      const statusMatches = providerPaid === localPaid;
      const result = amountMatches && currencyMatches && statusMatches ? 'MATCHED' : 'MISMATCH';
      if (result === 'MATCHED') matched += 1;
      else mismatched += 1;
      await prisma.paymentReconciliationItem.create({
        data: {
          runId: run.id,
          paymentId: payment.id,
          externalRef: payment.externalRef,
          expectedCents: payment.amountZar,
          providerCents: provider.amount,
          expectedStatus: payment.status,
          providerStatus: provider.status,
          result,
          detail: currencyMatches ? null : `Provider currency ${provider.currency}`
        }
      });
      if (amountMatches && currencyMatches && providerPaid && !localPaid) {
        await applyPaymentSuccess({
          paymentId: payment.id,
          providerEventId: `reconcile:${provider.id || provider.reference}`,
          payload: { source: 'reconciliation', provider },
          amountCents: provider.amount,
          currency: provider.currency
        });
      }
    }
    const wallet = await reconcileWallets();
    if (wallet.mismatches.length) mismatched += wallet.mismatches.length;
    const completed = await prisma.paymentReconciliationRun.update({
      where: { id: run.id },
      data: {
        status: mismatched || missingProvider ? 'ATTENTION_REQUIRED' : 'COMPLETED',
        scanned: candidates.length,
        matched,
        mismatched,
        missingProvider,
        error: wallet.mismatches.length ? `Wallet mismatches: ${JSON.stringify(wallet.mismatches)}` : null,
        completedAt: new Date()
      }
    });
    logger.info('payment_reconciliation_complete', { runId: run.id, matched, mismatched, missingProvider });
    if (mismatched || missingProvider) {
      await sendOperationalAlert('reconciliation_failure', 'Payment reconciliation needs attention', {
        runId: run.id,
        mismatched,
        missingProvider
      }).catch(() => undefined);
    }
    return completed;
  } catch (error) {
    await prisma.paymentReconciliationRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: String(error).slice(0, 1000), completedAt: new Date() }
    });
    await sendOperationalAlert('reconciliation_failure', 'Payment reconciliation failed', {
      runId: run.id,
      error: String(error)
    }).catch(() => undefined);
    throw error;
  }
}

export async function reconcilePaystackSettlements(from = new Date(Date.now() - 2 * 86400000), to = new Date()) {
  const settlements = await listPaystackSettlements(from, to);
  for (const settlement of settlements) {
    if (settlement.id == null || settlement.amount == null || !settlement.settlement_date) continue;
    const fee = Number(settlement.total_fees || 0);
    await prisma.providerSettlement.upsert({
      where: { provider_externalRef: { provider: 'paystack', externalRef: String(settlement.id) } },
      update: {
        grossCents: settlement.amount + fee,
        feeCents: fee,
        netCents: settlement.amount,
        settledAt: new Date(settlement.settlement_date),
        sourcePayload: settlement as Prisma.InputJsonValue
      },
      create: {
        provider: 'paystack',
        externalRef: String(settlement.id),
        grossCents: settlement.amount + fee,
        feeCents: fee,
        netCents: settlement.amount,
        settledAt: new Date(settlement.settlement_date),
        sourcePayload: settlement as Prisma.InputJsonValue
      }
    });
  }
  return { imported: settlements.length, from, to };
}
