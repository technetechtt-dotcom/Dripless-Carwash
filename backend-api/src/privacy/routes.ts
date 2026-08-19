import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { enqueue } from '../lib/queue.js';
import { createSignedDownload, readLocalObject } from '../evidence/storage.js';
import { env } from '../config/env.js';

export const privacyRouter = Router();

privacyRouter.post(
  '/consents',
  authRequired,
  validate(
    z.object({
      purpose: z.enum(['TERMS', 'POPIA_PROCESSING', 'MARKETING', 'LOCATION', 'EVIDENCE_PHOTOS']),
      granted: z.boolean(),
      version: z.string().min(1).max(20)
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
      if (!user) throw new HttpError(404, 'User not found');
      const row = await prisma.userConsent.create({
        data: {
          userId: user.id,
          purpose: req.body.purpose,
          granted: req.body.granted,
          version: req.body.version
        }
      });
      if (req.body.purpose === 'MARKETING') {
        await prisma.customerProfile.updateMany({
          where: { userId: user.id },
          data: { marketingConsentAt: req.body.granted ? new Date() : null }
        });
      }
      if (req.body.purpose === 'POPIA_PROCESSING') {
        await prisma.customerProfile.updateMany({
          where: { userId: user.id },
          data: { popiaConsentAt: req.body.granted ? new Date() : null }
        });
      }
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

privacyRouter.get('/requests', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.dataRequest.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(
      rows.map(({ exportUrl, ...row }) => ({
        ...row,
        downloadPath: exportUrl ? `/privacy/requests/${row.id}/download` : null
      }))
    );
  } catch (error) {
    next(error);
  }
});

privacyRouter.get('/requests/:requestId/download', authRequired, async (req, res, next) => {
  try {
    const request = await prisma.dataRequest.findFirst({
      where: { id: String(req.params.requestId), userId: req.auth!.userId, status: 'COMPLETED' }
    });
    if (!request?.exportUrl) throw new HttpError(404, 'Completed export not found');
    const signed = await createSignedDownload(request.exportUrl);
    if (signed) return res.redirect(302, signed);
    const local = readLocalObject(request.exportUrl);
    if (!local) throw new HttpError(404, 'Export object not found');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'attachment; filename="dripless-data-export.json"');
    res.type('application/json').send(local);
  } catch (error) {
    next(error);
  }
});

privacyRouter.get('/consents', authRequired, async (req, res, next) => {
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
    if (!user) throw new HttpError(404, 'User not found');
    const rows = await prisma.userConsent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

privacyRouter.post(
  '/requests',
  authRequired,
  validate(z.object({ kind: z.enum(['EXPORT', 'DELETE']) })),
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
      if (!user) throw new HttpError(404, 'User not found');
      const row = await prisma.dataRequest.create({
        data: { userId: user.id, kind: req.body.kind }
      });
      await enqueue('privacy.request', { requestId: row.id, kind: req.body.kind, userId: user.id });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

privacyRouter.get('/inventory', authRequired, async (_req, res) => {
  res.json({
    categories: [
      { name: 'Identity', lawfulBasis: 'contract', retention: 'account-lifetime + 5 years' },
      { name: 'Location', lawfulBasis: 'legitimate_interest', retention: `${env.GPS_RETENTION_DAYS} days` },
      { name: 'Evidence photos', lawfulBasis: 'contract', retention: `${env.EVIDENCE_RETENTION_DAYS} days` },
      { name: 'Driver documents', lawfulBasis: 'legal_obligation', retention: `${env.DRIVER_DOCUMENT_RETENTION_DAYS} days after deactivation` },
      { name: 'Payments', lawfulBasis: 'legal_obligation', retention: '7 years' },
      { name: 'Marketing', lawfulBasis: 'consent', retention: 'until withdrawn' }
    ]
  });
});
