import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';
import { createPaystackTransferRecipient, initiatePaystackTransfer } from '../payments/paystack.js';
import { enqueue } from '../lib/queue.js';

export const payoutsRouter = Router();

export async function accrueDriverEarning(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking?.driverId || booking.status !== 'COMPLETED') return null;
  const existing = await prisma.driverEarning.findFirst({ where: { bookingId } });
  if (existing) return existing;
  const amountCents = booking.price;
  const feeCents = Math.round(amountCents * 0.15);
  return prisma.driverEarning.create({
    data: {
      driverId: booking.driverId,
      bookingId,
      amountCents,
      feeCents,
      netCents: amountCents - feeCents,
      note: 'Job completion'
    }
  });
}

export async function processDriverPayout(payoutId: string) {
  const payout = await prisma.driverPayout.findUnique({
    where: { id: payoutId },
    include: { driver: { include: { payoutAccount: true } } }
  });
  if (!payout) throw new HttpError(404, 'Payout not found');
  if (payout.status === 'PAID' || payout.status === 'RECONCILED') return payout;
  const account = payout.driver.payoutAccount;
  if (!account || account.status !== 'VERIFIED') throw new HttpError(400, 'Verified payout account required');
  const transfer = await initiatePaystackTransfer({
    amountCents: payout.amountCents,
    recipientCode: account.providerRecipientCode,
    reason: `Dripless earnings ${payout.periodStart.toISOString().slice(0, 10)}-${payout.periodEnd.toISOString().slice(0, 10)}`,
    reference: payout.id
  });
  return prisma.driverPayout.update({
    where: { id: payout.id },
    data: {
      externalRef: transfer.transferCode,
      status: transfer.status === 'success' ? 'PAID' : 'PROCESSING'
    }
  });
}

export async function applyPayoutEvent(input: {
  reference: string;
  transferCode?: string;
  status: 'PAID' | 'FAILED';
}) {
  const payout = await prisma.driverPayout.findFirst({
    where: { OR: [{ id: input.reference }, { externalRef: input.reference }, ...(input.transferCode ? [{ externalRef: input.transferCode }] : [])] }
  });
  if (!payout) throw new HttpError(404, 'Payout not found');
  if (payout.status === 'PAID' || payout.status === 'RECONCILED') return payout;
  await prisma.driverPayout.updateMany({
    where: { id: payout.id, status: { in: ['PROCESSING', 'FAILED'] } },
    data: { status: input.status, externalRef: input.transferCode || payout.externalRef }
  });
  return prisma.driverPayout.findUniqueOrThrow({ where: { id: payout.id } });
}

payoutsRouter.get('/account', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const account = await prisma.driverPayoutAccount.findUnique({
      where: { driverId: req.auth!.profileId }
    });
    res.json(
      account
        ? {
            id: account.id,
            provider: account.provider,
            bankCode: account.bankCode,
            accountLast4: account.accountLast4,
            accountName: account.accountName,
            status: account.status,
            verifiedAt: account.verifiedAt
          }
        : null
    );
  } catch (error) {
    next(error);
  }
});

payoutsRouter.put(
  '/account',
  authRequired,
  roleRequired(['driver']),
  validate(
    z.object({
      bankCode: z.string().min(2).max(20),
      accountNumber: z.string().regex(/^\d{6,20}$/),
      accountName: z.string().min(2).max(120)
    })
  ),
  async (req, res, next) => {
    try {
      const recipientCode = await createPaystackTransferRecipient(req.body);
      const account = await prisma.driverPayoutAccount.upsert({
        where: { driverId: req.auth!.profileId },
        update: {
          providerRecipientCode: recipientCode,
          bankCode: req.body.bankCode,
          accountLast4: req.body.accountNumber.slice(-4),
          accountName: req.body.accountName,
          status: 'VERIFIED',
          verifiedAt: new Date()
        },
        create: {
          driverId: req.auth!.profileId,
          providerRecipientCode: recipientCode,
          bankCode: req.body.bankCode,
          accountLast4: req.body.accountNumber.slice(-4),
          accountName: req.body.accountName,
          status: 'VERIFIED',
          verifiedAt: new Date()
        }
      });
      res.json({
        id: account.id,
        bankCode: account.bankCode,
        accountLast4: account.accountLast4,
        accountName: account.accountName,
        status: account.status
      });
    } catch (error) {
      next(error);
    }
  }
);

payoutsRouter.get('/me', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const earnings = await prisma.driverEarning.findMany({
      where: { driverId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const payouts = await prisma.driverPayout.findMany({
      where: { driverId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' }
    });
    const available = earnings.filter((e) => !e.payoutId).reduce((s, e) => s + e.netCents, 0);
    res.json({
      availableZar: fromCents(available),
      earnings: earnings.map((e) => ({
        id: e.id,
        amountZar: fromCents(e.amountCents),
        feeZar: fromCents(e.feeCents),
        netZar: fromCents(e.netCents),
        bookingId: e.bookingId,
        createdAt: e.createdAt.toISOString()
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amountZar: fromCents(p.amountCents),
        status: p.status,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        createdAt: p.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
});

payoutsRouter.post(
  '/run',
  authRequired,
  roleRequired(['ops_admin']),
  permissionRequired('payouts:manage'),
  validate(z.object({ driverId: z.string().min(1), approvalId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const payout = await prisma.$transaction(async (tx) => {
        const approval = await tx.highRiskApproval.findUnique({ where: { id: req.body.approvalId } });
        const unpaid = await tx.driverEarning.findMany({
          where: { driverId: req.body.driverId, payoutId: null },
          orderBy: { createdAt: 'asc' }
        });
        if (!unpaid.length) throw new HttpError(400, 'No unpaid earnings');
        const amountCents = unpaid.reduce((sum, earning) => sum + earning.netCents, 0);
        const payload = (approval?.payload || {}) as Record<string, unknown>;
        if (
          !approval || approval.status !== 'APPROVED' || approval.action !== 'PAYOUT_APPROVAL' ||
          String(payload.driverId || '') !== req.body.driverId || Number(payload.maxAmountCents || 0) < amountCents
        ) throw new HttpError(403, 'Approved payout authorisation is required');
        const account = await tx.driverPayoutAccount.findUnique({ where: { driverId: req.body.driverId } });
        if (!account || account.status !== 'VERIFIED') throw new HttpError(400, 'Verified payout account required');
        const consumed = await tx.highRiskApproval.updateMany({
          where: { id: approval.id, status: 'APPROVED' }, data: { status: 'CONSUMED' }
        });
        if (consumed.count !== 1) throw new HttpError(409, 'Payout approval was already consumed');
        const now = new Date();
        const row = await tx.driverPayout.create({
          data: {
            driverId: req.body.driverId,
            amountCents,
            status: 'PROCESSING',
            periodStart: unpaid[0]?.createdAt ?? now,
            periodEnd: now
          }
        });
        const linked = await tx.driverEarning.updateMany({
          where: { id: { in: unpaid.map((e) => e.id) }, payoutId: null },
          data: { payoutId: row.id }
        });
        if (linked.count !== unpaid.length) throw new HttpError(409, 'Earnings changed during payout approval');
        return row;
      }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 });
      await enqueue('payout.process', { payoutId: payout.id });
      res.status(201).json({
        id: payout.id,
        amountZar: fromCents(payout.amountCents),
        status: payout.status
      });
    } catch (error) {
      next(error);
    }
  }
);

payoutsRouter.post(
  '/:payoutId/retry',
  authRequired,
  roleRequired(['ops_admin']),
  permissionRequired('payouts:manage'),
  async (req, res, next) => {
    try {
      const payout = await prisma.driverPayout.findUnique({ where: { id: String(req.params.payoutId) } });
      if (!payout || payout.status !== 'FAILED') throw new HttpError(400, 'Failed payout not found');
      await prisma.driverPayout.update({ where: { id: payout.id }, data: { status: 'PROCESSING' } });
      await enqueue('payout.process', { payoutId: payout.id });
      res.status(202).json({ queued: true });
    } catch (error) {
      next(error);
    }
  }
);
