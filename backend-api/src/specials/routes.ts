import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { mapPromotionDto } from '../dto/mappers.js';

export const specialsPublicRouter = Router();
export const specialsOpsRouter = Router();

function normalizeAudience(value: string) {
  if (value === 'all') return 'both';
  return value as 'customer' | 'driver' | 'both';
}

function normalizeScope(value: string) {
  const map: Record<string, string> = {
    RIDE: 'TAXI',
    PARCEL: 'DELIVERY',
    WASH: 'CAR_WASH',
    MATTRESS: 'HOME_SERVICE',
    COUCH: 'HOME_SERVICE',
    CARPET: 'HOME_SERVICE'
  };
  return (map[value] || value) as
    | 'ALL'
    | 'CAR_WASH'
    | 'TAXI'
    | 'DELIVERY'
    | 'WINDOW_SOLAR'
    | 'HOME_SERVICE';
}


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
    res.json(items.map(mapPromotionDto));
  } catch (error) {
    next(error);
  }
});

specialsOpsRouter.use(authRequired, roleRequired(['ops_admin']), permissionRequired('specials:manage'));

specialsOpsRouter.get('/', async (_req, res, next) => {
  try {
    res.json((await prisma.promotion.findMany({ orderBy: { updatedAt: 'desc' } })).map(mapPromotionDto));
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
        audience: z.enum(['customer', 'driver', 'both', 'all']),
        serviceScope: z.enum([
          'ALL',
          'CAR_WASH',
          'TAXI',
          'DELIVERY',
          'WINDOW_SOLAR',
          'HOME_SERVICE',
          'RIDE',
          'PARCEL',
          'MATTRESS',
          'COUCH',
          'CARPET',
          'WASH'
        ]),
        discountType: z.enum(['PERCENT', 'FIXED']),
        discountValue: z.number().positive().max(100000),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
        terms: z.string().max(2000).optional(),
        termsAndConditions: z.string().max(2000).optional(),
        actorId: z.string().optional(),
        actorName: z.string().optional()
      })
      
  ),
  async (req, res, next) => {
    try {
      const created = await prisma.promotion.create({
        data: {
          title: req.body.title,
          description: req.body.description,
          promoCode: String(req.body.promoCode).trim().toUpperCase(),
          audience: normalizeAudience(req.body.audience),
          serviceScope: normalizeScope(req.body.serviceScope),
          discountType: req.body.discountType,
          discountValue: req.body.discountValue,
          startsAt: new Date(req.body.startsAt),
          endsAt: new Date(req.body.endsAt),
          terms: req.body.termsAndConditions ?? req.body.terms,
          approved: false,
          isActive: false
        }
      });
      res.status(201).json(mapPromotionDto(created));
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
    res.json(mapPromotionDto(updated));
  } catch (error) {
    next(error);
  }
});

specialsOpsRouter.patch(
  '/:specialId/activation',
  validate(z.object({ isActive: z.boolean(), specialId: z.string().optional(), actorId: z.string().optional() })),
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
      res.json(mapPromotionDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

const specialUpdateSchema = z
  .object({
    title: z.string().min(2).max(120).optional(),
    description: z.string().min(2).max(1000).optional(),
    promoCode: z.string().min(3).max(40).optional(),
    audience: z.enum(['customer', 'driver', 'both', 'all']).optional(),
    serviceScope: z
      .enum(['ALL', 'CAR_WASH', 'TAXI', 'DELIVERY', 'WINDOW_SOLAR', 'HOME_SERVICE', 'RIDE', 'PARCEL', 'MATTRESS', 'COUCH', 'CARPET', 'WASH'])
      .optional(),
    discountType: z.enum(['PERCENT', 'FIXED']).optional(),
    discountValue: z.number().positive().max(100000).optional(),
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
    terms: z.string().max(2000).optional(),
    termsAndConditions: z.string().max(2000).optional()
  })
  ;

specialsOpsRouter.patch(
  '/:specialId',
  validate(specialUpdateSchema),
  async (req, res, next) => {
    try {
      const updated = await prisma.promotion.update({
        where: { id: String(req.params.specialId) },
        data: {
          title: req.body.title,
          description: req.body.description,
          promoCode: req.body.promoCode
            ? String(req.body.promoCode).trim().toUpperCase()
            : undefined,
          audience: req.body.audience,
          serviceScope: req.body.serviceScope,
          discountType: req.body.discountType,
          discountValue: req.body.discountValue,
          startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
          endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
          terms: req.body.termsAndConditions ?? req.body.terms
        }
      });
      res.json(mapPromotionDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

specialsOpsRouter.delete('/:specialId', async (req, res, next) => {
  try {
    await prisma.promotion.delete({ where: { id: String(req.params.specialId) } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

specialsPublicRouter.post(
  '/redeem',
  authRequired,
  validate(z.object({ promoCode: z.string().min(3).max(40), role: z.string().optional(), userId: z.string().optional() })),
  async (req, res, next) => {
    try {
      const code = String(req.body.promoCode).trim().toUpperCase();
      const now = new Date();
      const promotion = await prisma.promotion.findFirst({
        where: {
          promoCode: code,
          approved: true,
          isActive: true,
          startsAt: { lte: now },
          endsAt: { gte: now }
        }
      });
      if (!promotion) throw new HttpError(404, 'Promo not found or inactive');
      const role = req.auth!.role === 'ops_admin' ? 'customer' : req.auth!.role;
      if (promotion.audience !== 'both' && promotion.audience !== role) {
        throw new HttpError(400, 'Promo not available for this role');
      }
      const account =
        role === 'customer'
          ? await prisma.customerProfile.findUnique({ where: { id: req.auth!.profileId } })
          : await prisma.driverProfile.findUnique({ where: { id: req.auth!.profileId } });
      if (!account) throw new HttpError(400, 'Profile missing');
      await prisma.promotionRedemption.create({
        data: {
          promotionId: promotion.id,
          userId: account.userId,
          role: role as 'customer' | 'driver'
        }
      });
      const updated = await prisma.promotion.update({
        where: { id: promotion.id },
        data: {
          redemptionCount: { increment: 1 },
          lastRedeemedAt: now
        }
      });
      res.json(mapPromotionDto(updated));
    } catch (error) {
      next(error);
    }
  }
);
