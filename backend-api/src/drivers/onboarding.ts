import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { storeEvidenceObject } from '../evidence/storage.js';

export const driverOnboardingRouter = Router();

driverOnboardingRouter.get('/documents', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const rows = await prisma.driverDocument.findMany({
      where: { driverId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

driverOnboardingRouter.post(
  '/documents',
  authRequired,
  roleRequired(['driver']),
  validate(
    z.object({
      kind: z.enum([
        'SA_ID',
        'DRIVERS_LICENCE',
        'PROOF_OF_ADDRESS',
        'VEHICLE_REGISTRATION',
        'INSURANCE',
        'TRAINING_CERT',
        'OTHER'
      ]),
      dataUrl: z.string().min(20),
      expiresAt: z.string().optional()
    })
  ),
  async (req, res, next) => {
    try {
      const stored = await storeEvidenceObject({
        bookingId: req.auth!.profileId,
        kind: req.body.kind,
        dataUrl: req.body.dataUrl
      });
      const row = await prisma.driverDocument.create({
        data: {
          driverId: req.auth!.profileId,
          kind: req.body.kind,
          storageKey: stored.key,
          mimeType: stored.mimeType,
          expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
          status: 'PENDING'
        }
      });
      await prisma.driverProfile.update({
        where: { id: req.auth!.profileId },
        data: { verificationStatus: 'PENDING' }
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

driverOnboardingRouter.post(
  '/online',
  authRequired,
  roleRequired(['driver']),
  validate(z.object({ online: z.boolean() })),
  async (req, res, next) => {
    try {
      const driver = await prisma.driverProfile.findUnique({
        where: { id: req.auth!.profileId }
      });
      if (!driver) throw new HttpError(404, 'Driver not found');
      if (req.body.online && driver.verificationStatus !== 'VERIFIED') {
        throw new HttpError(403, 'Driver must be verified before going online');
      }
      const row = await prisma.driverProfile.update({
        where: { id: req.auth!.profileId },
        data: {
          online: req.body.online,
          shiftStartedAt: req.body.online ? new Date() : driver.shiftStartedAt,
          shiftEndedAt: req.body.online ? null : new Date()
        }
      });
      res.json({ online: row.online, shiftStartedAt: row.shiftStartedAt, shiftEndedAt: row.shiftEndedAt });
    } catch (error) {
      next(error);
    }
  }
);

driverOnboardingRouter.get('/kit', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const [equipment, consumables] = await Promise.all([
      prisma.driverEquipment.findMany({ where: { driverId: req.auth!.profileId } }),
      prisma.driverConsumable.findMany({ where: { driverId: req.auth!.profileId } })
    ]);
    res.json({ equipment, consumables });
  } catch (error) {
    next(error);
  }
});
