import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assertValidCoordinates } from '../geo/geocode.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';

export const driversRouter = Router();

const locationSchema = z
  .object({
    driverId: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    heading: z.number().nullable().optional(),
    speedKph: z.number().nullable().optional()
  })
  .strict();

driversRouter.patch(
  '/location',
  authRequired,
  roleRequired(['driver']),
  validate(locationSchema),
  async (req, res, next) => {
    try {
      const driverId = req.auth!.profileId;
      if (req.body.driverId && req.body.driverId !== driverId) {
        throw new HttpError(403, 'Driver can only update own location');
      }
      assertValidCoordinates(req.body.lat, req.body.lng);

      const driver = await prisma.driverProfile.findUnique({ where: { id: driverId } });
      if (!driver) throw new HttpError(404, 'Driver not found');

      const location = await prisma.driverLocation.upsert({
        where: { driverId },
        create: {
          driverId,
          lat: req.body.lat,
          lng: req.body.lng,
          heading: req.body.heading ?? null,
          speedKph: req.body.speedKph ?? null
        },
        update: {
          lat: req.body.lat,
          lng: req.body.lng,
          heading: req.body.heading ?? null,
          speedKph: req.body.speedKph ?? null
        }
      });

      res.json({
        ...driver,
        lastKnownLocation: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speedKph: location.speedKph,
          updatedAt: location.updatedAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

driversRouter.post(
  '/jobs/incoming',
  authRequired,
  roleRequired(['driver']),
  async (req, res, next) => {
    try {
      const driverId = req.auth!.profileId;
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [
            { driverId, status: { in: ['PENDING', 'CONFIRMED'] } },
            { driverId: null, status: 'PENDING' }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!booking) {
        return res.json(null);
      }

      // In production, do not assign without real pickup coordinates
      if (
        !env.demoMode &&
        (booking.pickupLat == null || booking.pickupLng == null)
      ) {
        return res.json(null);
      }

      res.json({
        id: booking.id,
        customerId: booking.customerId,
        driverId: booking.driverId,
        serviceType: booking.serviceSlug,
        serviceName: booking.serviceName,
        optionName: booking.optionName,
        status: booking.status,
        price: booking.price,
        pickupLocation: booking.pickupLocation,
        destinationLocation: booking.destinationLocation,
        pickupCoordinates:
          booking.pickupLat != null
            ? { lat: booking.pickupLat, lng: booking.pickupLng }
            : null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);
