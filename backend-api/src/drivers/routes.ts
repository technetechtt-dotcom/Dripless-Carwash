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
import { pointInPolygon } from '../geo/zones.js';
import { publishEvent } from '../lib/events.js';
import { accrueDriverEarning } from '../payouts/routes.js';
import { sendOperationalAlert } from '../lib/monitoring.js';

export const driversRouter = Router();

driversRouter.post(
  '/emergency',
  authRequired,
  roleRequired(['driver']),
  validate(
    z.object({
      bookingId: z.string().optional(),
      category: z.enum(['MEDICAL', 'SAFETY', 'ACCIDENT', 'THREAT', 'OTHER']),
      message: z.string().min(5).max(1000),
      lat: z.number().optional(),
      lng: z.number().optional()
    }).strict()
  ),
  async (req, res, next) => {
    try {
      const driver = await prisma.driverProfile.findUnique({ where: { id: req.auth!.profileId } });
      if (!driver) throw new HttpError(404, 'Driver not found');
      const bookingId = req.body.bookingId || driver.activeBookingId || null;
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.driverId !== driver.id) throw new HttpError(403, 'Forbidden');
      }
      const incident = await prisma.incident.create({
        data: {
          bookingId,
          severity: 'high',
          reason: `DRIVER EMERGENCY [${req.body.category}]: ${req.body.message}`
        }
      });
      await prisma.driverProfile.update({ where: { id: driver.id }, data: { online: false } });
      publishEvent('driver.emergency', {
        incidentId: incident.id,
        driverId: driver.id,
        bookingId,
        category: req.body.category,
        lat: req.body.lat,
        lng: req.body.lng
      });
      await sendOperationalAlert('dispatch_failure', 'Driver emergency reported', {
        incidentId: incident.id,
        driverId: driver.id,
        bookingId,
        category: req.body.category
      });
      res.status(201).json({ incidentId: incident.id, status: incident.status });
    } catch (error) {
      next(error);
    }
  }
);

const mapBooking = mapBookingDto;

const locationSchema = z
  .object({
    driverId: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    heading: z.number().nullable().optional(),
    speedKph: z.number().nullable().optional()
    ,accuracyM: z.number().min(0).max(5000).nullable().optional(),
    recordedAt: z.string().datetime().optional()
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

      const recordedAt = req.body.recordedAt ? new Date(req.body.recordedAt) : new Date();
      if (recordedAt > new Date(Date.now() + 60_000)) {
        throw new HttpError(400, 'GPS timestamp is in the future');
      }
      const previous = await prisma.driverLocation.findUnique({ where: { driverId } });
      if (previous?.sourceTimestamp && recordedAt <= previous.sourceTimestamp) {
        return res.json({ ignored: true, reason: 'stale_location_update' });
      }
      let computedSpeedKph = req.body.speedKph ?? null;
      if (previous) {
        const toRad = (degrees: number) => (degrees * Math.PI) / 180;
        const dLat = toRad(req.body.lat - previous.lat);
        const dLng = toRad(req.body.lng - previous.lng);
        const h =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(previous.lat)) * Math.cos(toRad(req.body.lat)) * Math.sin(dLng / 2) ** 2;
        const distanceKm = 6371 * 2 * Math.asin(Math.sqrt(h));
        const elapsedHours = Math.max(1, recordedAt.getTime() - previous.updatedAt.getTime()) / 3_600_000;
        computedSpeedKph = distanceKm / elapsedHours;
      }
      const spoofSuspect = Boolean(
        (computedSpeedKph != null && computedSpeedKph > 180) ||
        (req.body.accuracyM != null && req.body.accuracyM > 200)
      );

      const activeAreas = await prisma.serviceArea.findMany({ where: { active: true } });
      const insideArea =
        activeAreas.length === 0 ||
        activeAreas.some((area) => pointInPolygon({ lat: req.body.lat, lng: req.body.lng }, area.polygonGeoJson));
      if (!insideArea && driver.online && !driver.activeBookingId) {
        await prisma.driverProfile.update({ where: { id: driverId }, data: { online: false } });
      }

      const location = await prisma.driverLocation.upsert({
        where: { driverId },
        create: {
          driverId,
          lat: req.body.lat,
          lng: req.body.lng,
          heading: req.body.heading ?? null,
          speedKph: req.body.speedKph ?? null
          ,accuracyM: req.body.accuracyM ?? null,
          sourceTimestamp: recordedAt,
          spoofSuspect
        },
        update: {
          lat: req.body.lat,
          lng: req.body.lng,
          heading: req.body.heading ?? null,
          speedKph: req.body.speedKph ?? null,
          accuracyM: req.body.accuracyM ?? null,
          sourceTimestamp: recordedAt,
          spoofSuspect
        }
      });
      await prisma.driverLocationHistory.create({
        data: {
          driverId,
          lat: req.body.lat,
          lng: req.body.lng,
          heading: req.body.heading ?? null,
          speedKph: req.body.speedKph ?? null
          ,accuracyM: req.body.accuracyM ?? null,
          sourceTimestamp: recordedAt
        }
      });

      publishEvent('driver.location', {
        driverId,
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        speedKph: location.speedKph,
        accuracyM: location.accuracyM,
        updatedAt: location.updatedAt.toISOString(),
        stale: false,
        spoofSuspect,
        insideServiceArea: insideArea
      });

      res.json({
        ...driver,
        lastKnownLocation: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speedKph: location.speedKph,
          accuracyM: location.accuracyM,
          updatedAt: location.updatedAt.toISOString(),
          stale: false,
          spoofSuspect: location.spoofSuspect,
          insideServiceArea: insideArea
        },
        online: insideArea ? driver.online : false
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
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: { location: true }
      });
      if (
        !driver ||
        !driver.online ||
        driver.verificationStatus !== 'VERIFIED' ||
        !driver.location ||
        driver.location.updatedAt < new Date(Date.now() - 120_000)
      ) {
        return res.json(null);
      }
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
        const changed = await tx.booking.updateMany({
          where: { id: bookingId, driverId, status: booking.status },
          data: { status: 'EN_ROUTE' }
        });
        if (changed.count !== 1) throw new HttpError(409, 'Job offer changed or expired');
        const row = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
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
      publishEvent('driver.accepted', { bookingId, driverId });
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
        const changed = await tx.booking.updateMany({
          where: { id: bookingId, driverId, status: booking.status },
          data: { status: req.body.status }
        });
        if (changed.count !== 1) throw new HttpError(409, 'Booking changed; refresh and retry');
        const row = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
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
      publishEvent('booking.status', { bookingId, status: req.body.status, driverId });
      if (req.body.status === 'COMPLETED') await accrueDriverEarning(bookingId);
      res.json(mapBooking(updated));
    } catch (error) {
      next(error);
    }
  }
);
