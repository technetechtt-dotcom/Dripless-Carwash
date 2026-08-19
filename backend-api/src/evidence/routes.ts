import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import {
  createEvidenceKey,
  createSignedDownload,
  createSignedUpload,
  readLocalObject,
  storeEvidenceObject,
  validateEvidenceMetadata,
  verifySignedUpload
} from './storage.js';

export const evidenceRouter = Router();

const uploadKinds = ['BEFORE', 'AFTER', 'DAMAGE'] as const;

function pinDigest(pin: string) {
  const pepper = env.COMPLETION_PIN_PEPPER || 'development-only-completion-pin-pepper';
  return createHmac('sha256', pepper).update(pin).digest('hex');
}

async function requireBookingAccess(req: Request, bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (req.auth!.role === 'customer' && booking.customerId !== req.auth!.profileId) {
    throw new HttpError(403, 'Forbidden');
  }
  if (req.auth!.role === 'driver' && booking.driverId !== req.auth!.profileId) {
    throw new HttpError(403, 'Forbidden');
  }
  return booking;
}

function evidenceDto(row: {
  id: string;
  bookingId: string;
  kind: string;
  storageKey: string | null;
  mimeType: string | null;
  byteSize: number | null;
  checksum: string | null;
  notes: string | null;
  uploadStatus: string;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    kind: row.kind,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    checksum: row.checksum,
    notes: row.notes,
    uploadStatus: row.uploadStatus,
    verifiedAt: row.verifiedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    downloadPath:
      row.storageKey && row.uploadStatus === 'VERIFIED'
        ? `/bookings/${row.bookingId}/evidence/${row.id}/download`
        : null
  };
}

evidenceRouter.get('/:bookingId/evidence', authRequired, async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId);
    await requireBookingAccess(req, bookingId);
    const rows = await prisma.bookingEvidence.findMany({
      where: {
        bookingId,
        deletedAt: null,
        ...(req.auth!.role === 'customer' ? { uploadStatus: 'VERIFIED' } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(rows.map(evidenceDto));
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get(
  '/:bookingId/evidence/:evidenceId/download',
  authRequired,
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      await requireBookingAccess(req, bookingId);
      const row = await prisma.bookingEvidence.findFirst({
        where: {
          id: String(req.params.evidenceId),
          bookingId,
          uploadStatus: 'VERIFIED',
          deletedAt: null
        }
      });
      if (!row?.storageKey) throw new HttpError(404, 'Evidence not found');
      if (row.expiresAt && row.expiresAt <= new Date()) {
        throw new HttpError(410, 'Evidence has expired');
      }

      await prisma.evidenceAccessLog.create({
        data: {
          evidenceId: row.id,
          actorId: req.auth!.profileId,
          actorRole: req.auth!.role,
          action: 'DOWNLOAD',
          ipAddress: req.ip
        }
      });

      const signed = await createSignedDownload(row.storageKey);
      if (signed) return res.redirect(302, signed);
      const local = readLocalObject(row.storageKey);
      if (!local) throw new HttpError(404, 'Evidence object not found');
      res.setHeader('Cache-Control', 'private, no-store');
      res.type(row.mimeType || 'application/octet-stream').send(local);
    } catch (error) {
      next(error);
    }
  }
);

evidenceRouter.post(
  '/:bookingId/evidence/upload-url',
  authRequired,
  roleRequired(['driver', 'ops_admin']),
  validate(
    z
      .object({
        kind: z.enum(uploadKinds),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        byteSize: z.number().int().positive(),
        checksum: z.string().regex(/^[a-f0-9]{64}$/i),
        notes: z.string().max(2000).optional(),
        offlineQueued: z.boolean().optional()
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      await requireBookingAccess(req, bookingId);
      validateEvidenceMetadata(req.body);
      const key = createEvidenceKey(bookingId, req.body.kind);
      const expiresAt = new Date(Date.now() + env.EVIDENCE_RETENTION_DAYS * 86400000);
      const row = await prisma.bookingEvidence.create({
        data: {
          bookingId,
          kind: req.body.kind,
          urlOrData: `private://${key}`,
          storageKey: key,
          mimeType: req.body.mimeType,
          byteSize: req.body.byteSize,
          checksum: req.body.checksum.toLowerCase(),
          notes: req.body.notes,
          actorId: req.auth!.profileId,
          actorRole: req.auth!.role,
          offlineQueued: Boolean(req.body.offlineQueued),
          uploadStatus: 'PENDING',
          expiresAt
        }
      });
      const uploadUrl = await createSignedUpload({
        key,
        mimeType: req.body.mimeType,
        byteSize: req.body.byteSize,
        checksum: req.body.checksum.toLowerCase()
      });
      res.status(201).json({
        evidence: evidenceDto(row),
        uploadUrl,
        expiresInSeconds: 600,
        requiredHeaders: {
          'content-type': req.body.mimeType,
          'content-length': String(req.body.byteSize),
          'x-amz-meta-sha256-hex': req.body.checksum.toLowerCase(),
          'x-amz-server-side-encryption': 'AES256'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

evidenceRouter.post(
  '/:bookingId/evidence/:evidenceId/complete',
  authRequired,
  roleRequired(['driver', 'ops_admin']),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      await requireBookingAccess(req, bookingId);
      const row = await prisma.bookingEvidence.findFirst({
        where: { id: String(req.params.evidenceId), bookingId, deletedAt: null }
      });
      if (!row?.storageKey || !row.mimeType || !row.byteSize || !row.checksum) {
        throw new HttpError(404, 'Pending evidence upload not found');
      }
      if (row.actorId !== req.auth!.profileId && req.auth!.role !== 'ops_admin') {
        throw new HttpError(403, 'Forbidden');
      }
      if (row.uploadStatus === 'VERIFIED') return res.json(evidenceDto(row));
      const normalized = await verifySignedUpload({
        key: row.storageKey,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        checksum: row.checksum
      });
      const verified = await prisma.bookingEvidence.update({
        where: { id: row.id },
        data: {
          uploadStatus: 'VERIFIED',
          verifiedAt: new Date(),
          offlineQueued: false,
          mimeType: normalized.mimeType,
          byteSize: normalized.byteSize,
          checksum: normalized.checksum
        }
      });
      res.json(evidenceDto(verified));
    } catch (error) {
      next(error);
    }
  }
);

evidenceRouter.post(
  '/:bookingId/evidence',
  authRequired,
  roleRequired(['driver', 'ops_admin']),
  validate(
    z
      .object({
        kind: z.enum(['BEFORE', 'AFTER', 'DAMAGE', 'NOTE']),
        dataUrl: z.string().min(20).optional(),
        notes: z.string().max(2000).optional(),
        offlineQueued: z.boolean().optional()
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      await requireBookingAccess(req, bookingId);
      if (req.body.kind !== 'NOTE' && !req.body.dataUrl) {
        throw new HttpError(400, 'Image data is required for wash evidence');
      }
      if (req.body.kind === 'NOTE' && !req.body.notes) {
        throw new HttpError(400, 'Evidence note is required');
      }

      let stored:
        | { key: string; mimeType: string; byteSize: number; checksum: string; url: string }
        | undefined;
      if (req.body.dataUrl) {
        stored = await storeEvidenceObject({
          bookingId,
          kind: req.body.kind,
          dataUrl: req.body.dataUrl
        });
      }
      const row = await prisma.bookingEvidence.create({
        data: {
          bookingId,
          kind: req.body.kind,
          urlOrData: stored?.url || 'note',
          storageKey: stored?.key,
          mimeType: stored?.mimeType,
          byteSize: stored?.byteSize,
          checksum: stored?.checksum,
          notes: req.body.notes,
          actorId: req.auth!.profileId,
          actorRole: req.auth!.role,
          offlineQueued: Boolean(req.body.offlineQueued),
          uploadStatus: 'VERIFIED',
          verifiedAt: new Date(),
          expiresAt: stored
            ? new Date(Date.now() + env.EVIDENCE_RETENTION_DAYS * 86400000)
            : null
        }
      });
      res.status(201).json(evidenceDto(row));
    } catch (error) {
      next(error);
    }
  }
);

evidenceRouter.post(
  '/:bookingId/completion-pin',
  authRequired,
  roleRequired(['customer']),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      const booking = await requireBookingAccess(req, bookingId);
      if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
        throw new HttpError(400, 'A completion PIN cannot be issued for this booking');
      }
      const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          completionPinHash: pinDigest(pin),
          completionPinAttempts: 0,
          completionPinVerifiedAt: null
        }
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json({ pin, expiresWhen: 'booking-completes-or-is-cancelled' });
    } catch (error) {
      next(error);
    }
  }
);

evidenceRouter.post(
  '/:bookingId/completion-pin/verify',
  authRequired,
  roleRequired(['driver']),
  validate(z.object({ pin: z.string().regex(/^\d{6}$/) }).strict()),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      const booking = await requireBookingAccess(req, bookingId);
      if (!booking.completionPinHash) throw new HttpError(400, 'Customer has not issued a completion PIN');
      if (booking.completionPinVerifiedAt) return res.json({ verified: true });
      if (booking.completionPinAttempts >= 5) throw new HttpError(429, 'Completion PIN is locked');
      const expected = Buffer.from(booking.completionPinHash, 'hex');
      const actual = Buffer.from(pinDigest(req.body.pin), 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { completionPinAttempts: { increment: 1 } }
        });
        throw new HttpError(400, 'Incorrect completion PIN');
      }
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { completionPinVerifiedAt: new Date() }
        });
        await tx.bookingEvidence.create({
          data: {
            bookingId,
            kind: 'COMPLETION_PIN',
            urlOrData: 'verified',
            actorId: req.auth!.profileId,
            actorRole: 'driver',
            uploadStatus: 'VERIFIED',
            verifiedAt: new Date()
          }
        });
      });
      res.json({ verified: true });
    } catch (error) {
      next(error);
    }
  }
);

export async function assertWashCompletable(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { washChecklist: true }
  });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (!booking.serviceSlug.includes('wash') && booking.serviceSlug !== 'car-wash') return;
  if (env.demoMode) return;
  if (booking.completionProofOverrideAt) return;

  const evidence = await prisma.bookingEvidence.findMany({
    where: { bookingId, uploadStatus: 'VERIFIED', deletedAt: null }
  });
  const kinds = new Set(evidence.map((item) => item.kind));
  if (!kinds.has('BEFORE') || !kinds.has('AFTER')) {
    throw new HttpError(400, 'Wash completion requires verified BEFORE and AFTER photos');
  }
  if (!booking.completionPinVerifiedAt) {
    throw new HttpError(400, 'Wash completion requires a customer-verified completion PIN');
  }
  const checklist = booking.washChecklist;
  if (
    !checklist ||
    !checklist.exteriorDone ||
    !checklist.wheelsDone ||
    !checklist.glassDone ||
    !checklist.finalInspected
  ) {
    throw new HttpError(400, 'Wash completion requires the quality checklist');
  }
}
