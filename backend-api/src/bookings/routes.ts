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
import { bookingReference } from '../lib/ids.js';
import { assertInServiceArea, roadRoute } from '../geo/zones.js';
import { publishEvent } from '../lib/events.js';
import { processRefund } from '../payments/service.js';
import { accrueDriverEarning } from '../payouts/routes.js';
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
  scheduledTime: z.string().optional(),
  vehicleId: z.string().optional(),
  vehicleSize: z.string().optional(),
  addOnSlugs: z.array(z.string()).optional(),
  conditionNotes: z.string().max(500).optional(),
  accessInstructions: z.string().max(500).optional()
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
        userId: customer.userId,
        vehicleSize: req.body.vehicleSize,
        addOnSlugs: req.body.addOnSlugs,
        condition: req.body.conditionNotes
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

      const scheduledAtInput =
        req.body.scheduledAt ||
        (req.body.scheduledDate && req.body.scheduledTime
          ? `${req.body.scheduledDate}T${req.body.scheduledTime}`
          : null);
      const scheduledAt = scheduledAtInput ? new Date(scheduledAtInput) : new Date();
      if (Number.isNaN(scheduledAt.getTime())) throw new HttpError(400, 'Invalid scheduled time');
      if (scheduledAt < new Date(Date.now() - 60_000)) {
        throw new HttpError(400, 'Booking time cannot be in the past');
      }

      const area = await assertInServiceArea(pickup, req.body.pickupLocation, scheduledAt);
      let routeDistanceKm: number | undefined;
      let routeEtaMinutes: number | undefined;
      if (pickup && destination) {
        const route = await roadRoute(pickup, destination);
        routeDistanceKm = route.distanceKm;
        routeEtaMinutes = route.etaMinutes;
      }

      const booking = await prisma.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: {
            reference: bookingReference(),
            customerId,
            vehicleId: req.body.vehicleId,
            serviceAreaId: area?.id,
            serviceSlug: priced.serviceSlug,
            serviceName: priced.serviceName,
            optionSlug: priced.optionSlug,
            optionName: priced.optionName,
            status: 'PENDING',
            price: priced.price,
            basePrice: priced.basePrice,
            discountAmount: priced.discountAmount,
            surchargeCents: priced.surchargeCents ?? 0,
            promoCode: priced.promoCode,
            ecoPoints: priced.ecoPoints,
            pickupLocation: req.body.pickupLocation,
            destinationLocation: req.body.destinationLocation ?? null,
            pickupLat: pickup?.lat ?? null,
            pickupLng: pickup?.lng ?? null,
            destinationLat: destination?.lat ?? null,
            destinationLng: destination?.lng ?? null,
            routeDistanceKm,
            routeEtaMinutes,
            paymentMethod: req.body.paymentMethod ?? null,
            paymentStatus: 'UNPAID',
            vehicleSize: req.body.vehicleSize || 'STANDARD',
            addOnSlugs: req.body.addOnSlugs || [],
            conditionNotes: req.body.conditionNotes,
            accessInstructions: req.body.accessInstructions,
            scheduledAt
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
      publishEvent('booking.created', { bookingId: booking.id, customerId });
      if (assigned) publishEvent('booking.assigned', { bookingId: booking.id, driverId: assigned.driverId });

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
          include: {
            location: true,
            _count: { select: { bookings: { where: { status: 'COMPLETED' } } } }
          }
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
      driverPhone: driver?.phone,
      driverVehicle: driver?.vehicle,
      driverPlateNumber: driver?.plateNumber,
      driverRating: driver?.rating,
      driverAvatarUrl: driver?.avatarUrl,
      driverCompletedJobs: driver?._count.bookings ?? 0,
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

bookingsRouter.get('/:bookingId', authRequired, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.params.bookingId) },
      include: { customer: true }
    });
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
      throw new HttpError(403, 'Forbidden');
    }
    if (
      req.auth!.role === 'driver' &&
      booking.driverId &&
      booking.driverId !== req.auth!.profileId
    ) {
      throw new HttpError(403, 'Forbidden');
    }
    res.json(mapBookingDto(booking));
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

      if (req.auth!.role === 'customer') {
        throw new HttpError(
          403,
          'Customers cannot change booking status; use cancel or wait for driver/ops updates'
        );
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
        const changed = await tx.booking.updateMany({
          where: { id: booking.id, status: booking.status },
          data: { status: nextStatus }
        });
        if (changed.count !== 1) throw new HttpError(409, 'Booking changed; refresh and retry');
        const row = await tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
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

      publishEvent('booking.status', { bookingId: updated.id, status: nextStatus });
      if (nextStatus === 'COMPLETED') {
        await accrueDriverEarning(updated.id);
      }
      res.json(mapBookingDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.get('/:bookingId/policy', authRequired, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.params.bookingId) }
    });
    if (!booking) throw new HttpError(404, 'Booking not found');
    res.json(cancellationPolicy(booking.status));
  } catch (error) {
    next(error);
  }
});

bookingsRouter.get('/:bookingId/checklist', authRequired, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
    if (req.auth!.role === 'driver' && booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
    res.json(await prisma.washChecklist.findUnique({ where: { bookingId: booking.id } }));
  } catch (error) {
    next(error);
  }
});

bookingsRouter.patch(
  '/:bookingId/checklist',
  authRequired,
  roleRequired(['driver', 'ops_admin']),
  validate(
    z.object({
      exteriorDone: z.boolean().optional(),
      interiorDone: z.boolean().optional(),
      wheelsDone: z.boolean().optional(),
      glassDone: z.boolean().optional(),
      matsDone: z.boolean().optional(),
      finalInspected: z.boolean().optional(),
      rewashRequested: z.boolean().optional(),
      damageAck: z.boolean().optional(),
      notes: z.string().max(2000).nullable().optional()
    }).strict()
  ),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'driver' && booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      if (['COMPLETED', 'CANCELLED'].includes(booking.status)) throw new HttpError(409, 'Checklist is locked');
      const row = await prisma.washChecklist.upsert({
        where: { bookingId: booking.id },
        update: req.body,
        create: { bookingId: booking.id, ...req.body }
      });
      res.json(row);
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.post(
  '/:bookingId/consumables',
  authRequired,
  roleRequired(['driver']),
  validate(
    z.object({
      items: z.array(z.object({ sku: z.string().min(1).max(80), quantity: z.number().int().positive() })).min(1).max(30)
    })
  ),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
      if (!booking || booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      const rows = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const item of req.body.items as Array<{ sku: string; quantity: number }>) {
          const stock = await tx.driverConsumable.findUnique({
            where: { driverId_sku: { driverId: req.auth!.profileId, sku: item.sku } }
          });
          if (!stock || stock.quantity < item.quantity) throw new HttpError(400, `Insufficient stock for ${item.sku}`);
          await tx.driverConsumable.update({
            where: { id: stock.id },
            data: { quantity: { decrement: item.quantity } }
          });
          created.push(
            await tx.consumableUsage.create({
              data: { bookingId: booking.id, sku: stock.sku, name: stock.name, quantity: item.quantity }
            })
          );
        }
        return created;
      }, { isolationLevel: 'Serializable' });
      res.status(201).json(rows);
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.get('/:bookingId/messages', authRequired, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
    if (req.auth!.role === 'driver' && booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
    const rows = await prisma.bookingMessage.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: 'asc' } });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

bookingsRouter.post(
  '/:bookingId/messages',
  authRequired,
  validate(z.object({ body: z.string().trim().min(1).max(2000) }).strict()),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      if (req.auth!.role === 'driver' && booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      const row = await prisma.bookingMessage.create({
        data: {
          bookingId: booking.id,
          senderId: req.auth!.profileId,
          senderRole: req.auth!.role,
          body: req.body.body
        }
      });
      publishEvent('booking.message', { bookingId: booking.id, messageId: row.id, senderRole: row.senderRole });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.post(
  '/:bookingId/rating',
  authRequired,
  roleRequired(['customer']),
  validate(z.object({ stars: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }).strict()),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
      if (!booking || booking.customerId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      if (booking.status !== 'COMPLETED') throw new HttpError(400, 'Only completed bookings can be rated');
      const row = await prisma.rating.upsert({
        where: { bookingId_customerId: { bookingId: booking.id, customerId: req.auth!.profileId } },
        update: { stars: req.body.stars, comment: req.body.comment },
        create: {
          bookingId: booking.id,
          customerId: req.auth!.profileId,
          driverId: booking.driverId,
          stars: req.body.stars,
          comment: req.body.comment
        }
      });
      if (booking.driverId) {
        const aggregate = await prisma.rating.aggregate({ where: { driverId: booking.driverId }, _avg: { stars: true } });
        await prisma.driverProfile.update({
          where: { id: booking.driverId },
          data: { rating: aggregate._avg.stars || 5 }
        });
      }
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.post(
  '/:bookingId/customer-rating',
  authRequired,
  roleRequired(['driver']),
  validate(z.object({ stars: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }).strict()),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) } });
      if (!booking || booking.driverId !== req.auth!.profileId) throw new HttpError(403, 'Forbidden');
      if (booking.status !== 'COMPLETED') throw new HttpError(400, 'Only completed bookings can be rated');
      const row = await prisma.customerRating.upsert({
        where: { bookingId_driverId: { bookingId: booking.id, driverId: req.auth!.profileId } },
        update: { stars: req.body.stars, comment: req.body.comment },
        create: {
          bookingId: booking.id,
          customerId: booking.customerId,
          driverId: req.auth!.profileId,
          stars: req.body.stars,
          comment: req.body.comment
        }
      });
      const aggregate = await prisma.customerRating.aggregate({
        where: { customerId: booking.customerId },
        _avg: { stars: true }
      });
      await prisma.customerProfile.update({
        where: { id: booking.customerId },
        data: { rating: aggregate._avg.stars || 5 }
      });
      publishEvent('booking.status', {
        bookingId: booking.id,
        status: booking.status,
        customerRated: true,
        stars: req.body.stars
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.post(
  '/:bookingId/cancel',
  authRequired,
  validate(z.object({ reason: z.string().max(500).optional() })),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(req.params.bookingId) },
        include: { payments: true }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
        throw new HttpError(403, 'Forbidden');
      }
      const policy = cancellationPolicy(booking.status);
      if (booking.status === 'CANCELLED') {
        const existing = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { customer: true }
        });
        return res.json({ ...mapBookingDto(existing!), policy });
      }
      if (!policy.refundable && ['IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
        throw new HttpError(400, policy.summary);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.booking.updateMany({
          where: { id: booking.id, status: booking.status },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: req.body.reason,
            cancellationFeeCents: policy.feeCents
          }
        });
        if (changed.count !== 1) throw new HttpError(409, 'Booking changed; refresh and retry');
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: 'CANCELLED',
            actorId: req.auth!.profileId,
            actorRole: req.auth!.role,
            reason: req.body.reason || 'Booking cancelled'
          }
        });
        return tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: { customer: true }
        });
      });
      if (booking.driverId) {
        await prisma.driverProfile.update({
          where: { id: booking.driverId },
          data: { activeBookingId: null }
        });
      }
      const paid = booking.payments.find((p) => p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED');
      if (paid && policy.refundable) {
        await processRefund({
          paymentId: paid.id,
          amountCents: paid.amountZar,
          reason: req.body.reason || 'Customer cancellation',
          actorId: req.auth!.profileId,
          cancellationFeeCents: policy.feeCents,
          idempotencyKey: `cancellation:${booking.id}:${paid.id}`
        });
      }
      publishEvent('booking.status', { bookingId: booking.id, status: 'CANCELLED' });
      res.json({ ...mapBookingDto(updated), policy });
    } catch (error) {
      next(error);
    }
  }
);

bookingsRouter.post(
  '/:bookingId/reschedule',
  authRequired,
  validate(z.object({ scheduledAt: z.string().min(8) })),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(req.params.bookingId) }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
        throw new HttpError(403, 'Forbidden');
      }
      if (['COMPLETED', 'CANCELLED', 'IN_PROGRESS'].includes(booking.status)) {
        throw new HttpError(400, 'Booking cannot be rescheduled');
      }
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          scheduledAt: new Date(req.body.scheduledAt),
          rescheduledFromId: booking.id,
          status: 'PENDING',
          driverId: null
        },
        include: { customer: true }
      });
      await autoAssignDriver(updated.id);
      res.json(mapBookingDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

function cancellationPolicy(status: string) {
  // Locked Sandton pilot rules (see backend-api/src/config/pilot.ts)
  if (status === 'PENDING' || status === 'CONFIRMED') {
    return {
      refundable: true,
      feeCents: 0,
      summary: 'Free cancellation before the operator is en route.'
    };
  }
  if (status === 'EN_ROUTE' || status === 'ARRIVED') {
    return {
      refundable: true,
      feeCents: 2500,
      summary: 'R25.00 cancellation fee after dispatch (Sandton pilot policy).'
    };
  }
  return {
    refundable: false,
    feeCents: 0,
    summary: 'No refund once the wash is in progress or completed. Rewash guarantee may apply.'
  };
}
