import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { resolveCatalogueRef, resolveServerPrice } from '../catalog/pricing.js';
import { resolveCoordinatesAsync } from '../geo/geocode.js';
import { assertStatusTransition } from './statusMachine.js';
import {
  MAX_AUTO_DISPATCH_ATTEMPTS,
  autoAssignDriver,
  createOrRefreshDispatchIncident
} from './dispatch.js';
import { assertWashCompletable } from '../evidence/routes.js';
import { mapBookingDto } from '../dto/mappers.js';
import type { BookingStatus } from '@prisma/client';

export const bookingsRouter = Router();

const createBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  serviceSlug: z.string().min(1).optional(),
  serviceName: z.string().min(1).optional(),
  optionSlug: z.string().min(1).optional(),
  optionName: z.string().min(1).optional(),
  serviceType: z.string().optional(),
  pickupLocation: z.string().trim().min(3).max(500),
  destinationLocation: z.string().trim().max(500).optional().nullable(),
  pickupCoordinates: z
    .object({ lat: z.number(), lng: z.number() })
    .optional()
    .nullable(),
  destinationCoordinates: z
    .object({ lat: z.number(), lng: z.number() })
    .optional()
    .nullable(),
  paymentMethod: z.string().max(80).optional().nullable(),
  promoCode: z.string().max(40).optional().nullable(),
  appliedSpecialPromoCode: z.string().max(40).optional().nullable(),
  price: z.number().optional(),
  basePrice: z.number().optional(),
  discountAmount: z.number().optional(),
  specialDiscountAmount: z.number().optional(),
  scheduledAt: z.string().optional().nullable(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional()
});

const statusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'EN_ROUTE',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ]),
  reason: z.string().max(500).optional(),
  actorRole: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

bookingsRouter.post(
  '/',
  authRequired,
  roleRequired(['customer', 'ops_admin']),
  validate(createBookingSchema),
  async (req, res, next) => {
    try {
      const customerId =
        req.auth!.role === 'customer'
          ? req.auth!.profileId
          : req.body.customerId;
      if (!customerId) {
        throw new HttpError(400, 'customerId required for ops booking create');
      }

      const customer = await prisma.customerProfile.findUnique({
        where: { id: customerId },
        include: { user: true }
      });
      if (!customer || customer.status === 'SUSPENDED') {
        throw new HttpError(403, 'Customer account not bookable');
      }
      if (!customer.user.emailVerifiedAt) {
        throw new HttpError(403, 'Verify email before booking');
      }

      const { serviceSlug, optionSlug } = await resolveCatalogueRef({
        serviceSlug: req.body.serviceSlug,
        optionSlug: req.body.optionSlug,
        serviceName: req.body.serviceName,
        optionName: req.body.optionName,
        serviceType: req.body.serviceType
      });

      const priced = await resolveServerPrice({
        serviceSlug,
        optionSlug,
        promoCode: req.body.promoCode || req.body.appliedSpecialPromoCode,
        role: 'customer',
        userId: customer.userId
      });

      const pickup = await resolveCoordinatesAsync({
        lat: req.body.pickupCoordinates?.lat,
        lng: req.body.pickupCoordinates?.lng,
        label: req.body.pickupLocation
      });
      const destination = await resolveCoordinatesAsync({
        lat: req.body.destinationCoordinates?.lat,
        lng: req.body.destinationCoordinates?.lng,
        label: req.body.destinationLocation
      });

      const scheduledAt =
        req.body.scheduledAt ||
        (req.body.scheduledDate && req.body.scheduledTime
          ? `${req.body.scheduledDate}T${req.body.scheduledTime}`
          : null);

      const booking = await prisma.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: {
            customerId,
            serviceSlug: priced.serviceSlug,
            serviceName: priced.serviceName,
            optionSlug: priced.optionSlug,
            optionName: priced.optionName,
            status: 'PENDING',
            price: priced.price,
            basePrice: priced.basePrice,
            discountAmount: priced.discountAmount,
            promoCode: priced.promoCode,
            ecoPoints: priced.ecoPoints,
            pickupLocation: req.body.pickupLocation,
            destinationLocation: req.body.destinationLocation ?? null,
            pickupLat: pickup?.lat ?? null,
            pickupLng: pickup?.lng ?? null,
            destinationLat: destination?.lat ?? null,
            destinationLng: destination?.lng ?? null,
            paymentMethod: req.body.paymentMethod ?? null,
            paymentStatus: 'UNPAID',
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null
          }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: created.id,
            fromStatus: null,
            toStatus: 'PENDING',
            actorId: req.auth!.profileId,
            actorRole: req.auth!.role,
            reason: 'Booking created'
          }
        });
        await tx.auditLog.create({
          data: {
            actorId: customer.userId,
            actorRole: req.auth!.role,
            action: 'BOOKING_CREATED',
            targetId: created.id,
            message: `Booking created for ${priced.serviceName}`
          }
        });
        return created;
      });

      const assigned = await autoAssignDriver(booking.id);
      if (!assigned) {
        await createOrRefreshDispatchIncident(
          booking.id,
          'No available verified driver for auto-dispatch.',
          'medium'
        );
      }

      const fresh = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { customer: true }
      });
      res.status(201).json(mapBookingDto(fresh ?? booking));
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.get('/:bookingId/tracking', authRequired, async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (
      req.auth!.role === 'customer' &&
      booking.customerId !== req.auth!.profileId
    ) {
      throw new HttpError(403, 'Forbidden');
    }
    if (
      req.auth!.role === 'driver' &&
      booking.driverId &&
      booking.driverId !== req.auth!.profileId
    ) {
      throw new HttpError(403, 'Forbidden');
    }

    const driver = booking.driverId
      ? await prisma.driverProfile.findUnique({
          where: { id: booking.driverId },
          include: { location: true }
        })
      : null;

    res.json({
      bookingId: booking.id,
      status: booking.status,
      serviceType: mapBookingDto(booking).serviceType,
      pickupLocation: booking.pickupLocation,
      destinationLocation: booking.destinationLocation,
      pickupCoordinates:
        booking.pickupLat != null
          ? { lat: booking.pickupLat, lng: booking.pickupLng }
          : null,
      destinationCoordinates:
        booking.destinationLat != null
          ? { lat: booking.destinationLat, lng: booking.destinationLng }
          : null,
      driverId: booking.driverId ?? undefined,
      driverName: driver?.name,
      driverLocation: driver?.location
        ? {
            lat: driver.location.lat,
            lng: driver.location.lng,
            heading: driver.location.heading,
            speedKph: driver.location.speedKph,
            updatedAt: driver.location.updatedAt.toISOString()
          }
        : null
    });
  } catch (error) {
    next(error);
  }
});

bookingsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    if (req.auth!.role === 'customer') {
      const rows = await prisma.booking.findMany({
        where: { customerId: req.auth!.profileId },
        include: { customer: true },
        orderBy: { updatedAt: 'desc' }
      });
      return res.json(rows.map(mapBookingDto));
    }
    if (req.auth!.role === 'driver') {
      const rows = await prisma.booking.findMany({
        where: { driverId: req.auth!.profileId },
        include: { customer: true },
        orderBy: { updatedAt: 'desc' }
      });
      return res.json(rows.map(mapBookingDto));
    }
    const rows = await prisma.booking.findMany({
      include: { customer: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(rows.map(mapBookingDto));
  } catch (error) {
    next(error);
  }
});

bookingsRouter.patch(
  '/:bookingId/status',
  authRequired,
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');

      if (
        req.auth!.role === 'customer' &&
        booking.customerId !== req.auth!.profileId
      ) {
        throw new HttpError(403, 'Forbidden');
      }
      if (
        req.auth!.role === 'driver' &&
        booking.driverId &&
        booking.driverId !== req.auth!.profileId
      ) {
        throw new HttpError(403, 'Forbidden');
      }

      // Driver decline should redispatch, not terminal-cancel via status patch
      if (
        req.auth!.role === 'driver' &&
        req.body.status === 'CANCELLED' &&
        booking.driverId === req.auth!.profileId
      ) {
        const nextAttempt = booking.dispatchAttemptCount + 1;
        await prisma.$transaction(async (tx) => {
          await tx.driverProfile.update({
            where: { id: req.auth!.profileId },
            data: { activeBookingId: null }
          });
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              driverId: null,
              status: 'PENDING',
              dispatchAttemptCount: nextAttempt,
              dispatchReason: 'Driver declined via status update'
            }
          });
          await tx.bookingStatusHistory.create({
            data: {
              bookingId,
              fromStatus: booking.status,
              toStatus: 'PENDING',
              actorId: req.auth!.profileId,
              actorRole: 'driver',
              reason:
                req.body.reason ||
                (typeof req.body.metadata?.reason === 'string'
                  ? req.body.metadata.reason
                  : 'Driver declined')
            }
          });
        });
        if (nextAttempt >= MAX_AUTO_DISPATCH_ATTEMPTS) {
          await createOrRefreshDispatchIncident(
            bookingId,
            `Auto-dispatch attempts exceeded (${MAX_AUTO_DISPATCH_ATTEMPTS}).`,
            'high'
          );
        } else {
          await autoAssignDriver(bookingId);
        }
        const pending = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { customer: true }
        });
        return res.json(pending ? mapBookingDto(pending) : null);
      }

      const nextStatus = req.body.status as BookingStatus;
      assertStatusTransition(booking.status, nextStatus);
      if (nextStatus === 'COMPLETED') {
        await assertWashCompletable(booking.id);
      }

      const reason =
        req.body.reason ||
        (typeof req.body.metadata?.reason === 'string'
          ? req.body.metadata.reason
          : undefined);

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.booking.update({
          where: { id: booking.id },
          data: { status: nextStatus },
          include: { customer: true }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: nextStatus,
            actorId: req.auth!.profileId,
            actorRole: req.auth!.role,
            reason
          }
        });
        if (
          (nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED') &&
          booking.driverId
        ) {
          await tx.driverProfile.update({
            where: { id: booking.driverId },
            data: { activeBookingId: null }
          });
        }
        return row;
      });

      res.json(mapBookingDto(updated));
    } catch (error) {
      next(error);
    }
  }
);
