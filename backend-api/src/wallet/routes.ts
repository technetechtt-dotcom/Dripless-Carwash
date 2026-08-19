import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { fromCents, toCents } from '../money.js';
import { creditWalletWithApproval, mapLedgerDto } from './ledger.js';

export const walletRouter = Router();

walletRouter.get('/', authRequired, roleRequired(['customer']), async (req, res, next) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: req.auth!.profileId }
    });
    if (!profile) throw new HttpError(404, 'Profile not found');
    const entries = await prisma.walletLedgerEntry.findMany({
      where: { userId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({
      walletBalance: fromCents(profile.walletBalance),
      walletBalanceCents: profile.walletBalance,
      withdrawableBalance: fromCents(profile.walletCashBalance),
      withdrawableBalanceCents: profile.walletCashBalance,
      promotionalBalance: fromCents(profile.walletPromoBalance),
      promotionalBalanceCents: profile.walletPromoBalance,
      currency: 'ZAR',
      transactions: entries.map(mapLedgerDto)
    });
  } catch (error) {
    next(error);
  }
});

walletRouter.post(
  '/credit',
  authRequired,
  roleRequired(['ops_admin']),
  validate(
    z.object({
      userId: z.string().min(1),
      amountZar: z.number().positive(),
      promo: z.boolean().optional(),
      note: z.string().max(200).optional(),
      idempotencyKey: z.string().min(8).max(100),
      approvalId: z.string().min(1)
    })
  ),
  async (req, res, next) => {
    try {
      const amountCents = toCents(req.body.amountZar);
      const entry = await creditWalletWithApproval({
        approvalId: req.body.approvalId,
        userId: req.body.userId,
        amountCents,
        type: req.body.promo ? 'PROMO_CREDIT' : 'CREDIT',
        idempotencyKey: req.body.idempotencyKey,
        note: req.body.note
      });
      res.status(201).json(mapLedgerDto(entry));
    } catch (error) {
      next(error);
    }
  }
);
