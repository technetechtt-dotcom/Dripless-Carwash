import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { publishEvent } from '../lib/events.js';

export const complaintsRouter = Router();

complaintsRouter.post(
  '/',
  authRequired,
  roleRequired(['customer']),
  validate(
    z.object({
      bookingId: z.string().optional(),
      category: z.enum([
        'QUALITY',
        'DAMAGE',
        'LATENESS',
        'CONDUCT',
        'BILLING',
        'REWASH',
        'OTHER'
      ]),
      body: z.string().min(10).max(4000)
    })
  ),
  async (req, res, next) => {
    try {
      if (req.body.bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: req.body.bookingId } });
        if (!booking || booking.customerId !== req.auth!.profileId) {
          throw new HttpError(403, 'Forbidden');
        }
      }
      const row = await prisma.complaint.create({
        data: {
          customerId: req.auth!.profileId,
          bookingId: req.body.bookingId,
          category: req.body.category,
          body: req.body.body
        }
      });
      publishEvent('incident.created', { complaintId: row.id, category: row.category });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

complaintsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const where =
      req.auth!.role === 'ops_admin' ? {} : { customerId: req.auth!.profileId };
    const rows = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});
