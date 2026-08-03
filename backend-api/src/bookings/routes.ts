import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { resolveServerPrice } from '../catalog/pricing.js';
import { resolveCoordinates } from '../geo/geocode.js';
import { assertStatusTransition } from './statusMachine.js';
import type { BookingStatus } from '@prisma/client';

export const bookingsRouter = Router();

const createBookingSchema = z
  .object({
    // client may send these but they are ignored for pricing/ownership
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
    price: z.number().optional(),
    basePrice: z.number().optional(),
    discountAmount: z.number().optional(),
    scheduledAt: z.string().datetime().optional().nullable()
  })
  .strict();

const statusSchema = z
  .object({
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'EN_ROUTE',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    ]),
    reason: z.string().max(500).optional()
  })
  .strict();

function mapBooking(booking: {
  id: string;
  customerId: string;
  driverId: string | null;
  serviceSlug: string;
  serviceName: string;
  optionSlug: string;
  optionName: string;
  status: BookingStatus;
  price: number;
  basePrice: number;
  discountAmount: number;
  promoCode: string | null;
  ecoPoints: number;
  pickupLocation: string;
  destinationLocation: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  paymentMethod: string | null;
  paymentStatus: string;
  pooledWithBookingId: string | null;
  dispatchAttemptCount: number;
  dispatchReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    driverId: booking.driverId,
    serviceType: booking.serviceSlug,
    serviceName: booking.serviceName,
    optionName: booking.optionName,
    status: booking.status,
    price: booking.price,
    basePrice: booking.basePrice,
    discountAmount: booking.discountAmount,
    promoCode: booking.promoCode,
    ecoPoints: booking.ecoPoints,
    pickupLocation: booking.pickupLocation,
    destinationLocation: booking.destinationLocation,
    pickupCoordinates:
      booking.pickupLat != null && booking.pickupLng != null
        ? { lat: booking.pickupLat, lng: booking.pickupLng }
        : null,
    destinationCoordinates:
      booking.destinationLat != null && booking.destinationLng != null
        ? { lat: booking.destinationLat, lng: booking.destinationLng }
        : null,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    pooledWithBookingId: booking.pooledWithBookingId,
    dispatchAttemptCount: booking.dispatchAttemptCount,
    dispatchReason: booking.dispatchReason,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString()
  };
}

bookingsRouter.post(
  '/',
  authRequired,
  roleRequired(['customer', 'ops_admin']),
  validate(createBookingSchema),
  async (req, res, next) => {
    try {
      // Ownership: customers always book as themselves; client customerId is ignored.
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

      const serviceSlug =
        req.body.serviceSlug ||
        req.body.serviceType ||
        String(req.body.serviceName || '')
          .toLowerCase()
          .replace(/\s+/g, '-');
      const optionSlug =
        req.body.optionSlug ||
        String(req.body.optionName || 'standard')
          .toLowerCase()
          .replace(/\s+/g, '-');

      const priced = await resolveServerPrice({
        serviceSlug,
        optionSlug,
        promoCode: req.body.promoCode,
        role: 'customer',
        userId: customer.userId
      });

      const pickup = resolveCoordinates({
        lat: req.body.pickupCoordinates?.lat,
        lng: req.body.pickupCoordinates?.lng,
        label: req.body.pickupLocation
      });
      const destination = resolveCoordinates({
        lat: req.body.destinationCoordinates?.lat,
        lng: req.body.destinationCoordinates?.lng,
        label: req.body.destinationLocation
      });

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
            scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null
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

      res.status(201).json(mapBooking(booking));
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    if (req.auth!.role === 'customer') {
      const rows = await prisma.booking.findMany({
        where: { customerId: req.auth!.profileId },
        orderBy: { updatedAt: 'desc' }
      });
      return res.json(rows.map(mapBooking));
    }
    if (req.auth!.role === 'driver') {
      const rows = await prisma.booking.findMany({
        where: { driverId: req.auth!.profileId },
        orderBy: { updatedAt: 'desc' }
      });
      return res.json(rows.map(mapBooking));
    }
    const rows = await prisma.booking.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(rows.map(mapBooking));
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

      const nextStatus = req.body.status as BookingStatus;
      assertStatusTransition(booking.status, nextStatus);

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.booking.update({
          where: { id: booking.id },
          data: { status: nextStatus }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: nextStatus,
            actorId: req.auth!.profileId,
            actorRole: req.auth!.role,
            reason: req.body.reason
          }
        });
        return row;
      });

      res.json(mapBooking(updated));
    } catch (error) {
      next(error);
    }
  }
);
