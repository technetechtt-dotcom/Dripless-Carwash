import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { mapIncident, rankDriversForBooking } from '../bookings/dispatch.js';
import { mapBookingDto, mapCustomerProfile, mapDriverProfile } from '../dto/mappers.js';

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
    reason: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(req.params.bookingId) }
      });
      if (!booking) throw new HttpError(404, 'Booking not found');
      const driver = await prisma.driverProfile.findUnique({
        where: { id: req.body.driverId }
      });
      if (!driver || driver.status !== 'ACTIVE') {
        throw new HttpError(400, 'Driver not assignable');
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.booking.update({
          where: { id: booking.id },
          data: {
            driverId: driver.id,
            status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
            dispatchReason: req.body.reason || 'Manual ops assignment',
            dispatchAttemptCount: { increment: 1 }
          },
          include: { customer: true }
        });
        await tx.bookingAssignment.create({
          data: {
            bookingId: booking.id,
            driverId: driver.id,
            reason: req.body.reason || 'Manual ops assignment'
          }
        });
        await tx.driverProfile.update({
          where: { id: driver.id },
          data: { activeBookingId: booking.id }
        });
        return row;
      });
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
    z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().max(500).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const doc = await prisma.driverDocument.update({
        where: { id: String(req.params.documentId) },
        data: {
          status: req.body.status,
          rejectionReason: req.body.reason,
          reviewedById: req.auth!.profileId,
          reviewedAt: new Date()
        }
      });
      if (req.body.status === 'APPROVED') {
        const pending = await prisma.driverDocument.count({
          where: { driverId: String(req.params.driverId), status: 'PENDING' }
        });
        if (pending === 0) {
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
      res.json(doc);
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

