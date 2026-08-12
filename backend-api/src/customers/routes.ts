import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { resolveCoordinatesAsync } from '../geo/geocode.js';
import { mapCustomerProfile } from '../dto/mappers.js';

export const customersRouter = Router();

customersRouter.get('/me', authRequired, roleRequired(['customer']), async (req, res, next) => {
  try {
    const row = await prisma.customerProfile.findUnique({
      where: { id: req.auth!.profileId },
      include: { user: true, vehicles: true, addresses: true }
    });
    if (!row) throw new HttpError(404, 'Profile not found');
    res.json({
      ...mapCustomerProfile(row),
      vehicles: row.vehicles,
      addresses: row.addresses
    });
  } catch (error) {
    next(error);
  }
});

customersRouter.patch(
  '/me',
  authRequired,
  roleRequired(['customer']),
  validate(
    z.object({
      name: z.string().min(2).max(120).optional(),
      phone: z.string().min(7).max(32).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const row = await prisma.customerProfile.update({
        where: { id: req.auth!.profileId },
        data: {
          name: req.body.name,
          phone: req.body.phone
        },
        include: { user: true }
      });
      res.json(mapCustomerProfile(row));
    } catch (error) {
      next(error);
    }
  }
);

customersRouter.get('/me/vehicles', authRequired, roleRequired(['customer']), async (req, res, next) => {
  try {
    const rows = await prisma.vehicle.findMany({
      where: { customerId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

customersRouter.post(
  '/me/vehicles',
  authRequired,
  roleRequired(['customer']),
  validate(
    z.object({
      label: z.string().min(1).max(80),
      make: z.string().max(80).optional(),
      model: z.string().max(80).optional(),
      year: z.number().int().min(1980).max(2100).optional(),
      plate: z.string().max(20).optional(),
      sizeClass: z.enum(['STANDARD', 'SEDAN', 'SUV', 'BAKKIE', 'TRUCK']).optional(),
      colour: z.string().max(40).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const row = await prisma.vehicle.create({
        data: {
          customerId: req.auth!.profileId,
          label: req.body.label,
          make: req.body.make,
          model: req.body.model,
          year: req.body.year,
          plate: req.body.plate,
          sizeClass: req.body.sizeClass || 'STANDARD',
          colour: req.body.colour
        }
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

customersRouter.get('/me/addresses', authRequired, roleRequired(['customer']), async (req, res, next) => {
  try {
    const rows = await prisma.savedAddress.findMany({
      where: { customerId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

customersRouter.post(
  '/me/addresses',
  authRequired,
  roleRequired(['customer']),
  validate(
    z.object({
      label: z.string().min(1).max(80),
      line1: z.string().min(3).max(200),
      line2: z.string().max(200).optional(),
      suburb: z.string().max(80).optional(),
      city: z.string().max(80).optional(),
      postalCode: z.string().max(12).optional(),
      accessNotes: z.string().max(500).optional(),
      isDefault: z.boolean().optional()
    })
  ),
  async (req, res, next) => {
    try {
      const geo = await resolveCoordinatesAsync({ label: `${req.body.line1} ${req.body.city || ''}` });
      if (req.body.isDefault) {
        await prisma.savedAddress.updateMany({
          where: { customerId: req.auth!.profileId },
          data: { isDefault: false }
        });
      }
      const row = await prisma.savedAddress.create({
        data: {
          customerId: req.auth!.profileId,
          ...req.body,
          lat: geo?.lat,
          lng: geo?.lng
        }
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);
