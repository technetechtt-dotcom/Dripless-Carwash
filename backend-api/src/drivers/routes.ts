import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assertValidCoordinates } from '../geo/geocode.js';
import { HttpError } from '../middleware/error.js';
import { mapBookingDto } from '../dto/mappers.js';
import { env } from '../config/env.js';
import { assertStatusTransition } from '../bookings/statusMachine.js';
import {
  MAX_AUTO_DISPATCH_ATTEMPTS,
  autoAssignDriver,
  createOrRefreshDispatchIncident
} from '../bookings/dispatch.js';
import { assertWashCompletable } from '../evidence/routes.js';

export const driversRouter = Router();

const mapBooking = mapBookingDto;

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
          driverId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!booking) {
        return res.json(null);
      }

      if (
        !env.demoMode &&
        (booking.pickupLat == null || booking.pickupLng == null)
      ) {
        return res.json(null);
      }

      res.json(mapBooking(booking));
    } catch (error) {
      next(error);
    }
  }
);

driversRouter.post(
  '/jobs/:bookingId/accept',
  authRequired,
  roleRequired(['driver']),
  async (req, res, next) => {
    try {
      const driverId = req.auth!.profileId;
      const bookingId = String(req.params.bookingId);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (booking.driverId !== driverId) {
        throw new HttpError(403, 'Job not assigned to this driver');
      }
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new HttpError(400, 'Job cannot be accepted in current status');
      }

      assertStatusTransition(booking.status, 'EN_ROUTE');
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'EN_ROUTE' }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: booking.status,
            toStatus: 'EN_ROUTE',
            actorId: driverId,
            actorRole: 'driver',
            reason: 'Driver accepted job'
          }
        });
        await tx.driverProfile.update({
          where: { id: driverId },
          data: { activeBookingId: bookingId }
        });
        return row;
      });
      res.json(mapBooking(updated));
    } catch (error) {
      next(error);
    }
  }
);

driversRouter.post(
  '/jobs/:bookingId/decline',
  authRequired,
  roleRequired(['driver']),
  async (req, res, next) => {
    try {
      const driverId = req.auth!.profileId;
      const bookingId = String(req.params.bookingId);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (booking.driverId !== driverId) {
        throw new HttpError(403, 'Job not assigned to this driver');
      }

      const nextAttempt = booking.dispatchAttemptCount + 1;
      await prisma.$transaction(async (tx) => {
        await tx.driverProfile.update({
          where: { id: driverId },
          data: { activeBookingId: null }
        });
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            driverId: null,
            status: 'PENDING',
            dispatchAttemptCount: nextAttempt,
            dispatchReason: 'Driver declined'
          }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: booking.status,
            toStatus: 'PENDING',
            actorId: driverId,
            actorRole: 'driver',
            reason: 'Driver declined — redispatch'
          }
        });
      });

      if (nextAttempt >= MAX_AUTO_DISPATCH_ATTEMPTS) {
        await createOrRefreshDispatchIncident(
          bookingId,
          `Auto-dispatch attempts exceeded (${MAX_AUTO_DISPATCH_ATTEMPTS}) after driver declines.`,
          'high'
        );
        const pending = await prisma.booking.findUnique({ where: { id: bookingId } });
        return res.json(pending ? mapBooking(pending) : null);
      }

      const reassigned = await autoAssignDriver(bookingId);
      if (!reassigned) {
        await createOrRefreshDispatchIncident(
          bookingId,
          'No available verified driver after decline.',
          'medium'
        );
      }
      const pending = await prisma.booking.findUnique({ where: { id: bookingId } });
      res.json(pending ? mapBooking(pending) : null);
    } catch (error) {
      next(error);
    }
  }
);

driversRouter.patch(
  '/jobs/:bookingId/status',
  authRequired,
  roleRequired(['driver']),
  validate(
    z
      .object({
        status: z.enum([
          'EN_ROUTE',
          'ARRIVED',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED'
        ]),
        reason: z.string().max(500).optional()
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      const driverId = req.auth!.profileId;
      const bookingId = String(req.params.bookingId);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (booking.driverId !== driverId) throw new HttpError(403, 'Forbidden');
      assertStatusTransition(booking.status, req.body.status);
      if (req.body.status === 'COMPLETED') {
        await assertWashCompletable(bookingId);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.booking.update({
          where: { id: bookingId },
          data: { status: req.body.status }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: booking.status,
            toStatus: req.body.status,
            actorId: driverId,
            actorRole: 'driver',
            reason: req.body.reason
          }
        });
        if (req.body.status === 'COMPLETED' || req.body.status === 'CANCELLED') {
          await tx.driverProfile.update({
            where: { id: driverId },
            data: { activeBookingId: null }
          });
        }
        return row;
      });
      res.json(mapBooking(updated));
    } catch (error) {
      next(error);
    }
  }
);
