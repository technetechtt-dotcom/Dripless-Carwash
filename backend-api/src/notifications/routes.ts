import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerDeviceToken } from './service.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.notification.findMany({
      where: {
        OR: [{ userId: req.auth!.userId }, { role: req.auth!.role }],
        receipts: { none: { userId: req.auth!.userId, hiddenAt: { not: null } } }
      },
      include: { receipts: { where: { userId: req.auth!.userId }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        role: row.role,
        userId: row.userId,
        title: row.title,
        message: row.message,
        type: row.type,
        read: Boolean(row.receipts[0]?.readAt || (row.userId === req.auth!.userId && row.read)),
        createdAt: row.createdAt.toISOString()
      }))
    );
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:notificationId/read', authRequired, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: String(req.params.notificationId),
        OR: [{ userId: req.auth!.userId }, { role: req.auth!.role }]
      }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await prisma.notificationReceipt.upsert({
      where: { notificationId_userId: { notificationId: notification.id, userId: req.auth!.userId } },
      create: { notificationId: notification.id, userId: req.auth!.userId, readAt: new Date() },
      update: { readAt: new Date(), hiddenAt: null }
    });
    res.status(204).send();
  } catch (error) { next(error); }
});

notificationsRouter.post('/read-all', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.notification.findMany({
      where: { OR: [{ userId: req.auth!.userId }, { role: req.auth!.role }] },
      select: { id: true }
    });
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.notificationReceipt.createMany({
        data: rows.map((row) => ({ notificationId: row.id, userId: req.auth!.userId, readAt: now })),
        skipDuplicates: true
      });
      await tx.notificationReceipt.updateMany({
        where: { userId: req.auth!.userId, notificationId: { in: rows.map((row) => row.id) } },
        data: { readAt: now }
      });
    });
    res.status(204).send();
  } catch (error) { next(error); }
});

notificationsRouter.delete('/:notificationId', authRequired, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: String(req.params.notificationId), OR: [{ userId: req.auth!.userId }, { role: req.auth!.role }] }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await prisma.notificationReceipt.upsert({
      where: { notificationId_userId: { notificationId: notification.id, userId: req.auth!.userId } },
      create: { notificationId: notification.id, userId: req.auth!.userId, hiddenAt: new Date() },
      update: { hiddenAt: new Date() }
    });
    res.status(204).send();
  } catch (error) { next(error); }
});

notificationsRouter.post(
  '/devices',
  authRequired,
  validate(
    z.object({
      token: z.string().min(10).max(4096),
      platform: z.enum(['android', 'ios', 'web'])
    })
  ),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { customerProfile: { id: req.auth!.profileId } },
            { driverProfile: { id: req.auth!.profileId } },
            { opsProfile: { id: req.auth!.profileId } }
          ]
        }
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      const row = await registerDeviceToken(user.id, req.body.token, req.body.platform);
      res.status(201).json({ id: row.id, platform: row.platform });
    } catch (error) {
      next(error);
    }
  }
);

notificationsRouter.get('/preferences', authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { customerProfile: { id: req.auth!.profileId } },
          { driverProfile: { id: req.auth!.profileId } },
          { opsProfile: { id: req.auth!.profileId } }
        ]
      }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    });
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch(
  '/preferences',
  authRequired,
  validate(
    z.object({
      pushEnabled: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      marketing: z.boolean().optional()
    })
  ),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { customerProfile: { id: req.auth!.profileId } },
            { driverProfile: { id: req.auth!.profileId } },
            { opsProfile: { id: req.auth!.profileId } }
          ]
        }
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      const prefs = await prisma.notificationPreference.upsert({
        where: { userId: user.id },
        update: req.body,
        create: { userId: user.id, ...req.body }
      });
      res.json(prefs);
    } catch (error) {
      next(error);
    }
  }
);
