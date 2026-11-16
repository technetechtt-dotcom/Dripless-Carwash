import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

export const subscriptionsRouter = Router();

async function ownedSubscription(id: string, userId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!subscription) throw new HttpError(404, 'Subscription not found');
  return subscription;
}

subscriptionsRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { active: true } });
    res.json(
      plans.map((p) => ({
        ...p,
        monthlyZar: fromCents(p.monthlyCents)
      }))
    );
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get('/me', authRequired, roleRequired(['customer']), async (req, res, next) => {
  try {
    const rows = await prisma.subscription.findMany({
      where: { userId: req.auth!.userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows.map((row) => ({
      id: row.id,
      status: row.status,
      washesUsed: row.washesUsed,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      plan: { ...row.plan, monthlyZar: fromCents(row.plan.monthlyCents) }
    })));
  } catch (error) { next(error); }
});

subscriptionsRouter.post(
  '/',
  authRequired,
  roleRequired(['customer']),
  validate(z.object({ planId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: req.body.planId } });
      if (!plan?.active) throw new HttpError(404, 'Plan not found');
      const user = await prisma.customerProfile.findUnique({
        where: { id: req.auth!.profileId }
      });
      if (!user) throw new HttpError(404, 'Customer not found');
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const sub = await prisma.subscription.create({
        data: {
          userId: user.userId,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: start,
          currentPeriodEnd: end
        }
      });
      res.status(201).json(sub);
    } catch (error) {
      next(error);
    }
  }
);

subscriptionsRouter.post('/:id/pause', authRequired, async (req, res, next) => {
  try {
    const current = await ownedSubscription(String(req.params.id), req.auth!.userId);
    if (current.status !== 'ACTIVE') throw new HttpError(400, 'Only active subscriptions can be paused');
    const sub = await prisma.subscription.update({
      where: { id: current.id },
      data: { status: 'PAUSED', pausedAt: new Date() }
    });
    res.json(sub);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/resume', authRequired, async (req, res, next) => {
  try {
    const current = await ownedSubscription(String(req.params.id), req.auth!.userId);
    if (current.status !== 'PAUSED') throw new HttpError(400, 'Only paused subscriptions can be resumed');
    const sub = await prisma.subscription.update({
      where: { id: current.id },
      data: { status: 'ACTIVE', pausedAt: null }
    });
    res.json(sub);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/:id/cancel', authRequired, async (req, res, next) => {
  try {
    const current = await ownedSubscription(String(req.params.id), req.auth!.userId);
    if (current.status === 'CANCELLED') return res.json(current);
    const sub = await prisma.subscription.update({
      where: { id: current.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    });
    res.json(sub);
  } catch (error) {
    next(error);
  }
});
