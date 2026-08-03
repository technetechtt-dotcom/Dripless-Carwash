import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

export const specialsPublicRouter = Router();
export const specialsOpsRouter = Router();

specialsPublicRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const role =
      req.auth!.role === 'ops_admin'
        ? String(req.query.role || 'customer')
        : req.auth!.role;
    if (!['customer', 'driver'].includes(role)) {
      throw new HttpError(400, 'Invalid role for specials visibility');
    }
    const now = new Date();
    const items = await prisma.promotion.findMany({
      where: {
        approved: true,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [{ audience: role as 'customer' | 'driver' }, { audience: 'both' }]
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

specialsOpsRouter.use(authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'));

specialsOpsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await prisma.promotion.findMany({ orderBy: { updatedAt: 'desc' } }));
  } catch (error) {
    next(error);
  }
});

specialsOpsRouter.post(
  '/',
  validate(
    z
      .object({
        title: z.string().min(2).max(120),
        description: z.string().min(2).max(1000),
        promoCode: z.string().min(3).max(40),
        audience: z.enum(['customer', 'driver', 'both']),
        serviceScope: z.enum([
          'ALL',
          'CAR_WASH',
          'TAXI',
          'DELIVERY',
          'WINDOW_SOLAR',
          'HOME_SERVICE'
        ]),
        discountType: z.enum(['PERCENT', 'FIXED']),
        discountValue: z.number().positive().max(100000),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        terms: z.string().max(2000).optional()
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      const created = await prisma.promotion.create({
        data: {
          title: req.body.title,
          description: req.body.description,
          promoCode: String(req.body.promoCode).trim().toUpperCase(),
          audience: req.body.audience,
          serviceScope: req.body.serviceScope,
          discountType: req.body.discountType,
          discountValue: req.body.discountValue,
          startsAt: new Date(req.body.startsAt),
          endsAt: new Date(req.body.endsAt),
          terms: req.body.terms,
          approved: false,
          isActive: false
        }
      });
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

specialsOpsRouter.patch('/:specialId/approve', async (req, res, next) => {
  try {
    const updated = await prisma.promotion.update({
      where: { id: String(req.params.specialId) },
      data: {
        approved: true,
        approvedAt: new Date(),
        approvedByAdminId: req.auth!.profileId
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

specialsOpsRouter.patch(
  '/:specialId/activation',
  validate(z.object({ isActive: z.boolean() }).strict()),
  async (req, res, next) => {
    try {
      const existing = await prisma.promotion.findUnique({
        where: { id: String(req.params.specialId) }
      });
      if (!existing) throw new HttpError(404, 'Special not found');
      if (req.body.isActive && !existing.approved) {
        throw new HttpError(400, 'Special must be approved before activation');
      }
      const updated = await prisma.promotion.update({
        where: { id: existing.id },
        data: { isActive: req.body.isActive }
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);
