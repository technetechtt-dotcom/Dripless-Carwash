import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { mapIncident, rankDriversForBooking } from '../bookings/dispatch.js';
import { mapBookingDto, mapCustomerProfile, mapDriverProfile } from '../dto/mappers.js';
import { createSignedDownload, readLocalObject } from '../evidence/storage.js';
import { notifyUser } from '../notifications/service.js';
import { verifyPassword } from '../auth/password.js';
import { publishEvent } from '../lib/events.js';

export const opsRouter = Router();

opsRouter.use(authRequired, roleRequired(['ops_admin']));

opsRouter.get('/dashboard/summary', async (_req, res, next) => {
  try {
    const [
      totalCustomers,
      totalDrivers,
      activeBookings,
      pendingBookings,
      completedBookings,
      suspendedCustomers,
      suspendedDrivers,
      pendingDriverVerifications,
      unassignedBookings,
      slaBreaches,
      availableDrivers,
      paymentFailures,
      openIncidents,
      cancelledBookings
    ] = await Promise.all([
      prisma.customerProfile.count(),
      prisma.driverProfile.count(),
      prisma.booking.count({
        where: { status: { in: ['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } }
      }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.customerProfile.count({ where: { status: 'SUSPENDED' } }),
      prisma.driverProfile.count({ where: { status: 'SUSPENDED' } }),
      prisma.driverProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.booking.count({ where: { driverId: null, status: { not: 'CANCELLED' } } }),
      prisma.incident.count({ where: { severity: 'high', status: { not: 'RESOLVED' } } }),
      prisma.driverProfile.count({ where: { online: true, status: 'ACTIVE', verificationStatus: 'VERIFIED' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.incident.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } })
    ]);
    const totalTerminal = completedBookings + cancelledBookings;
    const completionRate = totalTerminal ? completedBookings / totalTerminal : 0;
    const cancellationRate = totalTerminal ? cancelledBookings / totalTerminal : 0;
    const assignments = await prisma.bookingAssignment.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { booking: true }
    });
    const averageAssignmentMinutes =
      assignments.length === 0
        ? 0
        : assignments.reduce((sum, row) => {
            const ms = row.createdAt.getTime() - row.booking.createdAt.getTime();
            return sum + ms / 60000;
          }, 0) / assignments.length;
    res.json({
      totalCustomers,
      totalDrivers,
      activeBookings,
      pendingBookings,
      completedBookings,
      suspendedCustomers,
      suspendedDrivers,
      pendingDriverVerifications,
      unassignedBookings,
      unassignedJobs: unassignedBookings,
      activeJobs: activeBookings,
      slaBreaches,
      availableDrivers,
      paymentFailures,
      openIncidents,
      averageAssignmentMinutes,
      completionRate,
      cancellationRate
    });
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/customers', permissionRequired('customers:read'), async (_req, res, next) => {
  try {
    const rows = await prisma.customerProfile.findMany({ include: { user: true }, orderBy: { updatedAt: 'desc' } });
    res.json(rows.map(mapCustomerProfile));
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/drivers', permissionRequired('drivers:read'), async (_req, res, next) => {
  try {
    const drivers = await prisma.driverProfile.findMany({
      include: { location: true, user: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(drivers.map(mapDriverProfile));
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/driver-documents', permissionRequired('drivers:verify'), async (req, res, next) => {
  try {
    const status = String(req.query.status || 'PENDING');
    const rows = await prisma.driverDocument.findMany({
      where: status === 'ALL' ? {} : { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' },
      include: { driver: { include: { user: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 250
    });
    res.json(
      rows.map(({ storageKey: _storageKey, ...row }) => ({
        ...row,
        downloadPath: `/ops/drivers/${row.driverId}/documents/${row.id}/download`
      }))
    );
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/driver-documents/expiry', permissionRequired('drivers:verify'), async (_req, res, next) => {
  try {
    const within30Days = new Date(Date.now() + 30 * 86400000);
    const rows = await prisma.driverDocument.findMany({
      where: { expiresAt: { lte: within30Days } },
      include: { driver: true },
      orderBy: { expiresAt: 'asc' }
    });
    res.json(rows.map(({ storageKey: _storageKey, ...row }) => row));
  } catch (error) {
    next(error);
  }
});

opsRouter.get(
  '/drivers/:driverId/documents/:documentId/download',
  permissionRequired('drivers:verify'),
  async (req, res, next) => {
    try {
      const document = await prisma.driverDocument.findFirst({
        where: { id: String(req.params.documentId), driverId: String(req.params.driverId) }
      });
      if (!document) throw new HttpError(404, 'Document not found');
      await prisma.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          actorRole: 'ops_admin',
          action: 'DRIVER_DOCUMENT_REVIEWED_FILE',
          targetId: document.id,
          message: `Ops accessed ${document.kind} for review`
        }
      });
      const signed = await createSignedDownload(document.storageKey);
      if (signed) return res.redirect(302, signed);
      const local = readLocalObject(document.storageKey);
      if (!local) throw new HttpError(404, 'Document object not found');
      res.setHeader('Cache-Control', 'private, no-store');
      res.type(document.mimeType).send(local);
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get(
  '/driver-locations',
  permissionRequired('drivers:read'),
  async (_req, res, next) => {
    try {
      const drivers = await prisma.driverProfile.findMany({ include: { location: true } });
      res.json(
        drivers.map((driver) => ({
          driverId: driver.id,
          driverName: driver.name,
          activeBookingId: driver.activeBookingId,
          status: driver.status,
          location: driver.location
            ? {
                lat: driver.location.lat,
                lng: driver.location.lng,
                heading: driver.location.heading,
                speedKph: driver.location.speedKph,
                updatedAt: driver.location.updatedAt.toISOString()
              }
            : null
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get('/bookings', permissionRequired('bookings:read'), async (_req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({ include: { customer: true }, orderBy: { updatedAt: 'desc' } });
    res.json(bookings.map(mapBookingDto));
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/activity', permissionRequired('activity:read'), async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 100);
    const rows = await prisma.auditLog.findMany({
      take: Number.isFinite(limit) ? limit : 100,
      orderBy: { createdAt: 'desc' }
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        type: row.action,
        actorId: row.actorId,
        actorRole: row.actorRole,
        targetId: row.targetId,
        message: row.message,
        createdAt: row.createdAt.toISOString()
      }))
    );
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/incidents', permissionRequired('incidents:read'), async (req, res, next) => {
  try {
    const includeResolved = String(req.query.includeResolved || 'false') === 'true';
    const rows = await prisma.incident.findMany({
      where: includeResolved ? undefined : { status: { not: 'RESOLVED' } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(rows.map(mapIncident));
  } catch (error) {
    next(error);
  }
});

opsRouter.post(
  '/incidents',
  permissionRequired('incidents:manage'),
  validate(
    z
      .object({
        bookingId: z.string().min(1),
        severity: z.enum(['medium', 'high']).default('medium'),
        reason: z.string().min(3).max(1000),
        actorId: z.string().optional()
      })
      
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.incident.findFirst({
        where: {
          bookingId: req.body.bookingId,
          status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED'] }
        }
      });
      if (existing) {
        const updated = await prisma.incident.update({
          where: { id: existing.id },
          data: {
            severity: req.body.severity,
            reason: req.body.reason
          }
        });
        return res.json(mapIncident(updated));
      }
      const created = await prisma.incident.create({
        data: {
          bookingId: req.body.bookingId,
          severity: req.body.severity,
          reason: req.body.reason,
          status: 'OPEN'
        }
      });
      await prisma.auditLog.create({
        data: {
          actorId: null,
          actorRole: 'ops_admin',
          action: 'INCIDENT_CREATED',
          targetId: req.body.bookingId,
          message: req.body.reason
        }
      });
      res.status(201).json(mapIncident(created));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/incidents/:incidentId/assign-self',
  permissionRequired('incidents:manage'),
  validate(
    z
      .object({
        adminId: z.string().optional(),
        adminName: z.string().optional(),
        incidentId: z.string().optional()
      })
  ),
  async (req, res, next) => {
    try {
      const updated = await prisma.incident.update({
        where: { id: String(req.params.incidentId) },
        data: {
          assigneeId: req.body.adminId || req.auth!.profileId,
          ownerAdminName: req.body.adminName || req.auth!.email
        }
      });
      res.json(mapIncident(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/incidents/:incidentId/acknowledge',
  permissionRequired('incidents:manage'),
  async (req, res, next) => {
    try {
      const updated = await prisma.incident.update({
        where: { id: String(req.params.incidentId) },
        data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() }
      });
      res.json(mapIncident(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/incidents/:incidentId/snooze',
  permissionRequired('incidents:manage'),
  validate(
    z
      .object({
        snoozeUntil: z.string().optional(),
        minutes: z.number().int().positive().max(24 * 60).optional(),
        snoozeMinutes: z.number().int().positive().max(24 * 60).optional(),
        incidentId: z.string().optional(),
        actorId: z.string().optional(),
        note: z.string().optional()
      })
  ),
  async (req, res, next) => {
    try {
      const until = req.body.snoozeUntil
        ? new Date(req.body.snoozeUntil)
        : new Date(Date.now() + (req.body.minutes || req.body.snoozeMinutes || 30) * 60_000);
      const updated = await prisma.incident.update({
        where: { id: String(req.params.incidentId) },
        data: { status: 'SNOOZED', snoozedUntil: until }
      });
      res.json(mapIncident(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/incidents/:incidentId/resolve',
  permissionRequired('incidents:manage'),
  async (req, res, next) => {
    try {
      const updated = await prisma.incident.update({
        where: { id: String(req.params.incidentId) },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
      res.json(mapIncident(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/incidents/:incidentId/escalate',
  permissionRequired('incidents:manage'),
  async (req, res, next) => {
    try {
      const updated = await prisma.incident.update({
        where: { id: String(req.params.incidentId) },
        data: {
          severity: 'high',
          status: 'OPEN',
          lastEscalatedAt: new Date()
        }
      });
      res.json(mapIncident(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get(
  '/bookings/:bookingId/timeline',
  permissionRequired('bookings:read'),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      const history = await prisma.bookingStatusHistory.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'asc' }
      });
      const audits = await prisma.auditLog.findMany({
        where: { targetId: bookingId },
        orderBy: { createdAt: 'asc' }
      });
      res.json([
        ...history.map((row) => ({
          id: row.id,
          type: 'BOOKING_STATUS_UPDATED',
          actorId: row.actorId || 'system',
          actorRole: row.actorRole || 'ops_admin',
          targetId: bookingId,
          message: `${row.fromStatus ?? 'none'} -> ${row.toStatus}${row.reason ? `: ${row.reason}` : ''}`,
          createdAt: row.createdAt.toISOString()
        })),
        ...audits.map((row) => ({
          id: row.id,
          type: row.action,
          actorId: row.actorId || 'system',
          actorRole: row.actorRole || 'ops_admin',
          targetId: bookingId,
          message: row.message,
          createdAt: row.createdAt.toISOString()
        }))
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get(
  '/bookings/:bookingId/recommendations',
  permissionRequired('bookings:assign'),
  async (req, res, next) => {
    try {
      const limit = Number(req.query.limit || 5);
      const ranked = await rankDriversForBooking(
        String(req.params.bookingId),
        Number.isFinite(limit) ? limit : 5
      );
      res.json(ranked);
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get('/analytics', permissionRequired('activity:read'), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const bookings = await prisma.booking.findMany({
      where: { createdAt: { gte: from, lte: to } }
    });
    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const revenue = completed.reduce((sum, b) => sum + b.price, 0);
    const byService = new Map<string, number>();
    for (const booking of bookings) {
      byService.set(booking.serviceSlug, (byService.get(booking.serviceSlug) || 0) + 1);
    }
    let topServiceType = 'n/a';
    let topCount = 0;
    for (const [slug, count] of byService) {
      if (count > topCount) {
        topServiceType = slug;
        topCount = count;
      }
    }
    res.json({
      totalBookings: bookings.length,
      completionRate: bookings.length ? completed.length / bookings.length : 0,
      revenue,
      avgBookingValue: completed.length ? revenue / completed.length : 0,
      topServiceType
    });
  } catch (error) {
    next(error);
  }
});

opsRouter.patch(
  '/customers/:customerId/status',
  permissionRequired('customers:update'),
  validate(z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW']),
    customerId: z.string().optional(),
    actorId: z.string().optional(),
    reason: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const updated = await prisma.customerProfile.update({
        where: { id: String(req.params.customerId) },
        data: { status: req.body.status },
        include: { user: true }
      });
      res.json(mapCustomerProfile(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/drivers/:driverId/status',
  permissionRequired('drivers:update'),
  validate(z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW']),
    customerId: z.string().optional(),
    driverId: z.string().optional(),
    actorId: z.string().optional(),
    reason: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const updated = await prisma.driverProfile.update({
        where: { id: String(req.params.driverId) },
        data: { status: req.body.status },
        include: { user: true, location: true }
      });
      res.json(mapDriverProfile(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/drivers/:driverId/verification',
  permissionRequired('drivers:verify'),
  validate(z.object({
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
    driverId: z.string().optional(),
    actorId: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const updated = await prisma.driverProfile.update({
        where: { id: String(req.params.driverId) },
        data: { verificationStatus: req.body.verificationStatus },
        include: { user: true, location: true }
      });
      res.json(mapDriverProfile(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.patch(
  '/bookings/:bookingId/assign-driver',
  permissionRequired('bookings:assign'),
  validate(z.object({
    driverId: z.string().min(1),
    bookingId: z.string().optional(),
    actorId: z.string().optional(),
    reason: z.string().min(5).max(500)
  })),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(req.params.bookingId) }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');
      const driver = await prisma.driverProfile.findUnique({
        where: { id: req.body.driverId },
        include: { location: true }
      });
      if (
        !driver ||
        driver.status !== 'ACTIVE' ||
        driver.verificationStatus !== 'VERIFIED' ||
        !driver.online ||
        !driver.location ||
        driver.location.updatedAt < new Date(Date.now() - 120_000) ||
        (driver.activeBookingId && driver.activeBookingId !== booking.id)
      ) {
        throw new HttpError(400, 'Driver not assignable');
      }
      const updated = await prisma.$transaction(async (tx) => {
        const driverClaim = await tx.driverProfile.updateMany({
          where: {
            id: driver.id,
            activeBookingId: driver.activeBookingId,
            online: true,
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED'
          },
          data: { activeBookingId: booking.id }
        });
        if (driverClaim.count !== 1) throw new HttpError(409, 'Driver was assigned concurrently');
        const bookingClaim = await tx.booking.updateMany({
          where: { id: booking.id, driverId: booking.driverId, status: booking.status },
          data: {
            driverId: driver.id,
            status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
            dispatchReason: req.body.reason,
            dispatchAttemptCount: { increment: 1 },
            acceptBy: new Date(Date.now() + driver.acceptTimeoutSec * 1000)
          }
        });
        if (bookingClaim.count !== 1) throw new HttpError(409, 'Booking was assigned concurrently');
        if (booking.driverId && booking.driverId !== driver.id) {
          await tx.driverProfile.updateMany({
            where: { id: booking.driverId, activeBookingId: booking.id },
            data: { activeBookingId: null }
          });
        }
        await tx.bookingAssignment.create({
          data: {
            bookingId: booking.id,
            driverId: driver.id,
            reason: req.body.reason
          }
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
            actorId: req.auth!.profileId,
            actorRole: 'ops_admin',
            reason: req.body.reason
          }
        });
        return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { customer: true } });
      }, { maxWait: 10_000, timeout: 20_000 });
      publishEvent('booking.assigned', {
        bookingId: updated.id,
        driverId: driver.id,
        status: updated.status
      });
      if (updated.status !== booking.status) {
        publishEvent('booking.status', {
          bookingId: updated.id,
          status: updated.status
        });
      }
      res.json(mapBookingDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.post(
  '/notifications/broadcast',
  permissionRequired('notifications:broadcast'),
  validate(
    z
      .object({
        title: z.string().min(1).max(120),
        message: z.string().min(1).max(2000),
        type: z.enum(['info', 'warning', 'success', 'error']).default('info'),
        targetCustomer: z.boolean().optional(),
        targetDriver: z.boolean().optional(),
        targetOps: z.boolean().optional(),
        targetRoles: z.array(z.enum(['customer', 'driver', 'ops_admin'])).optional()
      })
  ),
  async (req, res, next) => {
    try {
      const roles = new Set<string>();
      if (req.body.targetRoles?.length) {
        for (const role of req.body.targetRoles) roles.add(role);
      } else {
        if (req.body.targetCustomer !== false) roles.add('customer');
        if (req.body.targetDriver !== false) roles.add('driver');
        if (req.body.targetOps) roles.add('ops_admin');
      }
      const rows = [...roles].map((role) => ({
        role: role as 'customer' | 'driver' | 'ops_admin',
        title: req.body.title,
        message: req.body.message,
        type: req.body.type
      }));
      await prisma.notification.createMany({ data: rows });
      await prisma.broadcast.create({
        data: {
          title: req.body.title,
          message: req.body.message,
          audience: [...roles].join(','),
          sentAt: new Date(),
          createdById: req.auth!.profileId
        }
      });
      res.status(201).json({ created: rows.length });
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get('/search', permissionRequired('bookings:read'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ customers: [], drivers: [], bookings: [], incidents: [] });
    const [customers, drivers, bookings, incidents] = await Promise.all([
      prisma.customerProfile.findMany({
        where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] },
        take: 10,
        include: { user: true }
      }),
      prisma.driverProfile.findMany({
        where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { plateNumber: { contains: q, mode: 'insensitive' } }] },
        take: 10
      }),
      prisma.booking.findMany({
        where: { OR: [{ id: { contains: q } }, { reference: { contains: q, mode: 'insensitive' } }] },
        take: 10
      }),
      prisma.incident.findMany({
        where: { reason: { contains: q, mode: 'insensitive' } },
        take: 10
      })
    ]);
    res.json({
      customers: customers.map(mapCustomerProfile),
      drivers: drivers.map(mapDriverProfile),
      bookings: bookings.map(mapBookingDto),
      incidents: incidents.map(mapIncident)
    });
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/finance/payments', permissionRequired('bookings:read'), async (_req, res, next) => {
  try {
    const rows = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

opsRouter.get('/finance/payouts', permissionRequired('drivers:read'), async (_req, res, next) => {
  try {
    const rows = await prisma.driverPayout.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

opsRouter.post(
  '/drivers/:driverId/documents/:documentId/review',
  permissionRequired('drivers:verify'),
  validate(
    z
      .object({
        status: z.enum(['APPROVED', 'REJECTED']),
        reason: z.string().max(500).optional()
      })
      .superRefine((value, ctx) => {
        if (value.status === 'REJECTED' && (!value.reason || value.reason.trim().length < 10)) {
          ctx.addIssue({ code: 'custom', path: ['reason'], message: 'A clear rejection reason is required' });
        }
      })
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.driverDocument.findFirst({
        where: { id: String(req.params.documentId), driverId: String(req.params.driverId) },
        include: { driver: { include: { user: true } } }
      });
      if (!existing) throw new HttpError(404, 'Driver document not found');
      if (req.body.status === 'APPROVED' && existing.expiresAt && existing.expiresAt <= new Date()) {
        throw new HttpError(400, 'Expired documents cannot be approved');
      }
      const doc = await prisma.driverDocument.update({
        where: { id: existing.id },
        data: {
          status: req.body.status,
          rejectionReason: req.body.reason,
          reviewedById: req.auth!.profileId,
          reviewedAt: new Date()
        }
      });
      if (req.body.status === 'APPROVED') {
        const documents = await prisma.driverDocument.findMany({
          where: { driverId: String(req.params.driverId) },
          orderBy: [{ kind: 'asc' }, { submissionVersion: 'desc' }]
        });
        const latestByKind = new Map<string, (typeof documents)[number]>();
        for (const document of documents) {
          if (!latestByKind.has(document.kind)) latestByKind.set(document.kind, document);
        }
        const required = ['SA_ID', 'DRIVERS_LICENCE', 'PROOF_OF_ADDRESS', 'VEHICLE_REGISTRATION'];
        const compliant = required.every((kind) => {
          const document = latestByKind.get(kind);
          return (
            document?.status === 'APPROVED' &&
            (!document.expiresAt || document.expiresAt > new Date())
          );
        });
        if (compliant) {
          await prisma.driverProfile.update({
            where: { id: String(req.params.driverId) },
            data: { verificationStatus: 'VERIFIED', status: 'ACTIVE', verificationNote: null }
          });
        }
      } else {
        await prisma.driverProfile.update({
          where: { id: String(req.params.driverId) },
          data: { verificationStatus: 'REJECTED', verificationNote: req.body.reason }
        });
      }
      await prisma.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          actorRole: 'ops_admin',
          action: `DRIVER_DOCUMENT_${req.body.status}`,
          targetId: doc.id,
          message: `${doc.kind} ${req.body.status.toLowerCase()} for driver ${req.params.driverId}`,
          metadata: { reason: req.body.reason || null, submissionVersion: doc.submissionVersion }
        }
      });
      await notifyUser({
        userId: existing.driver.userId,
        email: existing.driver.user.email,
        phone: existing.driver.phone || undefined,
        title: `Driver document ${req.body.status.toLowerCase()}`,
        message:
          req.body.status === 'APPROVED'
            ? `${doc.kind} was approved.`
            : `${doc.kind} was rejected: ${req.body.reason}`,
        template: `driver.document_${req.body.status.toLowerCase()}`
      });
      res.json(doc);
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.post(
  '/high-risk-approvals',
  validate(
    z.object({
      action: z.enum(['PAYMENT_REFUND', 'WALLET_ADJUSTMENT', 'COMPLETION_PROOF_OVERRIDE', 'PAYOUT_APPROVAL']),
      payload: z.record(z.string(), z.unknown()),
      reason: z.string().min(10).max(500)
    })
  ),
  async (req, res, next) => {
    try {
      const row = await prisma.highRiskApproval.create({
        data: {
          action: req.body.action,
          payload: { ...req.body.payload, reason: req.body.reason },
          requestedBy: req.auth!.profileId
        }
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.post(
  '/high-risk-approvals/:approvalId/approve',
  validate(z.object({ password: z.string().min(8) })),
  async (req, res, next) => {
    try {
      const approval = await prisma.highRiskApproval.findUnique({
        where: { id: String(req.params.approvalId) }
      });
      if (!approval) throw new HttpError(404, 'Approval request not found');
      if (approval.status !== 'PENDING') throw new HttpError(409, 'Approval request is no longer pending');
      if (approval.requestedBy === req.auth!.profileId) {
        throw new HttpError(403, 'A different Ops administrator must approve this action');
      }
      const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
      if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) {
        throw new HttpError(401, 'Reauthentication failed');
      }
      const changed = await prisma.highRiskApproval.updateMany({
        where: { id: approval.id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: req.auth!.profileId,
          decidedAt: new Date()
        }
      });
      if (changed.count !== 1) throw new HttpError(409, 'Approval was decided concurrently');
      res.json(await prisma.highRiskApproval.findUniqueOrThrow({ where: { id: approval.id } }));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.post(
  '/bookings/:bookingId/completion-proof-override',
  permissionRequired('bookings:update'),
  validate(z.object({ approvalId: z.string().min(1), reason: z.string().min(15).max(500) })),
  async (req, res, next) => {
    try {
      const approval = await prisma.highRiskApproval.findUnique({ where: { id: req.body.approvalId } });
      const payload = (approval?.payload || {}) as Record<string, unknown>;
      if (
        !approval ||
        approval.status !== 'APPROVED' ||
        approval.action !== 'COMPLETION_PROOF_OVERRIDE' ||
        String(payload.bookingId || '') !== String(req.params.bookingId)
      ) {
        throw new HttpError(403, 'Approved completion-proof override is required');
      }
      const updated = await prisma.$transaction(async (tx) => {
        const consumed = await tx.highRiskApproval.updateMany({
          where: { id: approval.id, status: 'APPROVED' },
          data: { status: 'CONSUMED' }
        });
        if (consumed.count !== 1) throw new HttpError(409, 'Approval was already consumed');
        const booking = await tx.booking.update({
          where: { id: String(req.params.bookingId) },
          data: {
            completionProofOverrideAt: new Date(),
            completionProofOverrideBy: req.auth!.profileId,
            completionProofOverrideReason: req.body.reason
          }
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.userId,
            actorRole: 'ops_admin',
            action: 'COMPLETION_PROOF_OVERRIDE',
            targetId: booking.id,
            message: req.body.reason,
            metadata: { approvalId: approval.id }
          }
        });
        return booking;
      });
      res.json(mapBookingDto(updated));
    } catch (error) {
      next(error);
    }
  }
);

opsRouter.get('/settings', async (_req, res, next) => {
  try {
    const rows = await prisma.platformSetting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (error) {
    next(error);
  }
});

opsRouter.post(
  '/reconcile',
  permissionRequired('activity:read'),
  validate(
    z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const from = req.body.from
        ? new Date(`${req.body.from}T00:00:00.000Z`)
        : new Date(Date.now() - 7 * 86400000);
      const to = req.body.to
        ? new Date(`${req.body.to}T23:59:59.999Z`)
        : new Date();

      const payments = await prisma.payment.findMany({
        where: { createdAt: { gte: from, lte: to }, status: 'PAID' }
      });

      const total = payments.length;
      const mismatches: Array<{ paymentId: string; reason: string }> = [];

      for (const payment of payments) {
        if (!payment.externalRef) {
          mismatches.push({ paymentId: payment.id, reason: 'Missing external reference' });
          continue;
        }
        const events = await prisma.paymentEvent.count({
          where: { paymentId: payment.id, eventType: 'charge.success' }
        });
        if (events === 0) {
          mismatches.push({ paymentId: payment.id, reason: 'No charge.success event recorded' });
        }
      }

      const matched = total - mismatches.length;

      await prisma.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          actorRole: 'ops_admin',
          action: 'RECONCILIATION_RUN',
          message: `Reconciliation: ${matched}/${total} matched, ${mismatches.length} mismatches`,
          metadata: { from: from.toISOString(), to: to.toISOString(), mismatches: mismatches.slice(0, 20) }
        }
      });

      res.json({ matched, mismatches: mismatches.length, total, details: mismatches.slice(0, 50) });
    } catch (error) {
      next(error);
    }
  }
);

