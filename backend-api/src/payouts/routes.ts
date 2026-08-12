import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

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
  validate(z.object({ driverId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const unpaid = await prisma.driverEarning.findMany({
        where: { driverId: req.body.driverId, payoutId: null }
      });
      if (!unpaid.length) throw new HttpError(400, 'No unpaid earnings');
      const amountCents = unpaid.reduce((s, e) => s + e.netCents, 0);
      const now = new Date();
      const start = unpaid[unpaid.length - 1]?.createdAt ?? now;
      const payout = await prisma.$transaction(async (tx) => {
        const row = await tx.driverPayout.create({
          data: {
            driverId: req.body.driverId,
            amountCents,
            status: 'PAID',
            periodStart: start,
            periodEnd: now
          }
        });
        await tx.driverEarning.updateMany({
          where: { id: { in: unpaid.map((e) => e.id) } },
          data: { payoutId: row.id }
        });
        return row;
      });
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
