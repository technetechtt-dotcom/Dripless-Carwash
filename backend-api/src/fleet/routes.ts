import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

export const fleetRouter = Router();

fleetRouter.post(
  '/',
  authRequired,
  roleRequired(['customer']),
  validate(
    z.object({
      name: z.string().min(2).max(120),
      billingEmail: z.string().email(),
      registrationNo: z.string().max(40).optional(),
      costCentre: z.string().max(40).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const account = await prisma.fleetAccount.create({
        data: {
          name: req.body.name,
          billingEmail: req.body.billingEmail,
          registrationNo: req.body.registrationNo,
          costCentre: req.body.costCentre,
          ownerCustomerId: req.auth!.profileId,
          members: {
            create: {
              userId: (
                await prisma.customerProfile.findUniqueOrThrow({
                  where: { id: req.auth!.profileId }
                })
              ).userId,
              role: 'owner'
            }
          }
        }
      });
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }
);

fleetRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.fleetAccount.findMany({
      where:
        req.auth!.role === 'ops_admin'
          ? undefined
          : {
              OR: [
                { ownerCustomerId: req.auth!.profileId },
                { members: { some: { user: { customerProfile: { id: req.auth!.profileId } } } } }
              ]
            },
      include: { vehicles: true, members: true }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

fleetRouter.get('/:id/impact', authRequired, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { fleetAccountId: String(req.params.id), status: 'COMPLETED' }
    });
    const waterSaved = bookings.reduce((s, b) => s + b.waterLitresSaved, 0);
    const spendCents = bookings.reduce((s, b) => s + b.price, 0);
    res.json({
      washes: bookings.length,
      waterSavedLitres: waterSaved,
      spendZar: fromCents(spendCents)
    });
  } catch (error) {
    next(error);
  }
});
