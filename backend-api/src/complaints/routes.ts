import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, permissionRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { publishEvent } from '../lib/events.js';
import { notifyUser } from '../notifications/service.js';

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

complaintsRouter.get('/', authRequired, roleRequired(['customer', 'ops_admin']), async (req, res, next) => {
  try {
    if (req.auth!.role === 'ops_admin' && !req.auth!.permissions.includes('incidents:read')) {
      throw new HttpError(403, 'Missing permission: incidents:read');
    }
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

complaintsRouter.patch(
  '/:complaintId',
  authRequired,
  roleRequired(['ops_admin']),
  permissionRequired('incidents:manage'),
  validate(
    z
      .object({
        status: z.enum(['IN_REVIEW', 'ESCALATED', 'RESOLVED', 'REJECTED']),
        resolution: z.string().max(4000).optional()
      })
      .superRefine((value, ctx) => {
        if (
          ['RESOLVED', 'REJECTED'].includes(value.status) &&
          (!value.resolution || value.resolution.trim().length < 10)
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['resolution'],
            message: 'A clear resolution is required when closing a complaint'
          });
        }
      })
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.complaint.findUnique({
        where: { id: String(req.params.complaintId) },
        include: { customer: { include: { user: true } } }
      });
      if (!existing) throw new HttpError(404, 'Complaint not found');
      const complaint = await prisma.$transaction(async (tx) => {
        const updated = await tx.complaint.update({
          where: { id: existing.id },
          data: {
            status: req.body.status,
            resolution: req.body.resolution?.trim() || null
          }
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.userId,
            actorRole: 'ops_admin',
            action: 'COMPLAINT_STATUS_UPDATED',
            targetId: existing.id,
            message: `Complaint moved to ${req.body.status}`,
            metadata: { previousStatus: existing.status, resolution: req.body.resolution || null }
          }
        });
        return updated;
      });
      await notifyUser({
        userId: existing.customer.userId,
        email: existing.customer.user.email,
        phone: existing.customer.phone || undefined,
        title: `Support case ${complaint.status.toLowerCase().replace('_', ' ')}`,
        message: complaint.resolution || `Your support case ${complaint.id} is now ${complaint.status.toLowerCase().replace('_', ' ')}.`,
        template: 'complaint.status_changed'
      });
      publishEvent('incident.updated', { complaintId: complaint.id, status: complaint.status });
      res.json(complaint);
    } catch (error) {
      next(error);
    }
  }
);
