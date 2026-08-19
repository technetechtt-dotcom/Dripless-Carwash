import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { createSignedDownload, readLocalObject, storeEvidenceObject } from '../evidence/storage.js';

export const driverOnboardingRouter = Router();

driverOnboardingRouter.get('/documents', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const rows = await prisma.driverDocument.findMany({
      where: { driverId: req.auth!.profileId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(
      rows.map(({ storageKey: _storageKey, ...row }) => ({
        ...row,
        downloadPath: `/driver/documents/${row.id}/download`
      }))
    );
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
      const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
      if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
        throw new HttpError(400, 'Document expiry must be in the future');
      }
      if (['DRIVERS_LICENCE', 'INSURANCE', 'TRAINING_CERT'].includes(req.body.kind) && !expiresAt) {
        throw new HttpError(400, 'Expiry date is required for this document type');
      }
      const previous = await prisma.driverDocument.findFirst({
        where: { driverId: req.auth!.profileId, kind: req.body.kind },
        orderBy: { submissionVersion: 'desc' }
      });
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
          byteSize: stored.byteSize,
          checksum: stored.checksum,
          expiresAt,
          submissionVersion: (previous?.submissionVersion || 0) + 1,
          supersedesId: previous?.id,
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

driverOnboardingRouter.get(
  '/documents/:documentId/download',
  authRequired,
  roleRequired(['driver']),
  async (req, res, next) => {
    try {
      const document = await prisma.driverDocument.findFirst({
        where: { id: String(req.params.documentId), driverId: req.auth!.profileId }
      });
      if (!document) throw new HttpError(404, 'Document not found');
      await prisma.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          actorRole: 'driver',
          action: 'DRIVER_DOCUMENT_DOWNLOADED',
          targetId: document.id,
          message: `Driver downloaded ${document.kind}`
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

driverOnboardingRouter.post(
  '/online',
  authRequired,
  roleRequired(['driver']),
  validate(z.object({ online: z.boolean() })),
  async (req, res, next) => {
    try {
      const driver = await prisma.driverProfile.findUnique({
        where: { id: req.auth!.profileId },
        include: { documents: true, location: true, equipment: true, consumables: true }
      });
      if (!driver) throw new HttpError(404, 'Driver not found');
      if (req.body.online && driver.verificationStatus !== 'VERIFIED') {
        throw new HttpError(403, 'Driver must be verified before going online');
      }
      if (req.body.online) {
        const required = ['SA_ID', 'DRIVERS_LICENCE', 'VEHICLE_REGISTRATION'];
        const documentsReady = required.every((kind) =>
          driver.documents.some(
            (document) =>
              document.kind === kind &&
              document.status === 'APPROVED' &&
              (!document.expiresAt || document.expiresAt > new Date())
          )
        );
        if (!documentsReady) throw new HttpError(403, 'Required driver documents are missing or expired');
        if (!driver.location || driver.location.updatedAt < new Date(Date.now() - 120_000)) {
          throw new HttpError(400, 'A fresh GPS location is required before going online');
        }
        if (driver.location.spoofSuspect) throw new HttpError(403, 'GPS location requires Ops review');
        const equipmentReady = driver.equipment.some((item) => !item.returnedAt && !item.faultNote);
        if (!equipmentReady) throw new HttpError(403, 'No serviceable equipment is allocated');
        if (driver.consumables.some((item) => item.quantity <= 0)) {
          throw new HttpError(403, 'Consumable stock must be replenished');
        }
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

driverOnboardingRouter.get('/availability', authRequired, roleRequired(['driver']), async (req, res, next) => {
  try {
    const rows = await prisma.driverAvailability.findMany({
      where: { driverId: req.auth!.profileId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }]
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

driverOnboardingRouter.put(
  '/availability',
  authRequired,
  roleRequired(['driver']),
  validate(
    z.object({
      slots: z.array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          active: z.boolean().optional()
        })
      ).max(28)
    })
  ),
  async (req, res, next) => {
    try {
      for (const slot of req.body.slots) {
        if (slot.startTime >= slot.endTime) throw new HttpError(400, 'Availability end time must be after start');
      }
      await prisma.$transaction(async (tx) => {
        await tx.driverAvailability.deleteMany({ where: { driverId: req.auth!.profileId } });
        if (req.body.slots.length) {
          await tx.driverAvailability.createMany({
            data: req.body.slots.map((slot: { weekday: number; startTime: string; endTime: string; active?: boolean }) => ({
              driverId: req.auth!.profileId,
              weekday: slot.weekday,
              startTime: slot.startTime,
              endTime: slot.endTime,
              active: slot.active ?? true
            }))
          });
        }
      });
      const rows = await prisma.driverAvailability.findMany({ where: { driverId: req.auth!.profileId } });
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

driverOnboardingRouter.post(
  '/equipment/:equipmentId/fault',
  authRequired,
  roleRequired(['driver']),
  validate(z.object({ note: z.string().min(5).max(500) })),
  async (req, res, next) => {
    try {
      const updated = await prisma.driverEquipment.updateMany({
        where: { id: String(req.params.equipmentId), driverId: req.auth!.profileId, returnedAt: null },
        data: { faultNote: req.body.note }
      });
      if (!updated.count) throw new HttpError(404, 'Equipment not found');
      await prisma.driverProfile.update({
        where: { id: req.auth!.profileId },
        data: { online: false }
      });
      res.json({ reported: true });
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
