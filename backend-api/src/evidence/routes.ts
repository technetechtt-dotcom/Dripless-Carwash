import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

export const evidenceRouter = Router();

function ensureStorageDir() {
  mkdirSync(env.EVIDENCE_STORAGE_DIR, { recursive: true });
}

evidenceRouter.get('/:bookingId/evidence', authRequired, async (req, res, next) => {
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
    const rows = await prisma.bookingEvidence.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

evidenceRouter.post(
  '/:bookingId/evidence',
  authRequired,
  roleRequired(['driver', 'ops_admin']),
  validate(
    z
      .object({
        kind: z.enum(['BEFORE', 'AFTER', 'DAMAGE', 'NOTE', 'COMPLETION_PIN']),
        dataUrl: z.string().min(1).max(5_000_000).optional(),
        notes: z.string().max(2000).optional(),
        pin: z.string().min(4).max(8).optional()
      })
  ),
  async (req, res, next) => {
    try {
      const bookingId = String(req.params.bookingId);
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (
        req.auth!.role === 'driver' &&
        booking.driverId !== req.auth!.profileId
      ) {
        throw new HttpError(403, 'Forbidden');
      }

      if (req.body.kind === 'COMPLETION_PIN') {
        if (!req.body.pin) throw new HttpError(400, 'PIN required');
        const pinHash = createHash('sha256').update(req.body.pin).digest('hex');
        await prisma.booking.update({
          where: { id: bookingId },
          data: { completionPinHash: pinHash }
        });
        const row = await prisma.bookingEvidence.create({
          data: {
            bookingId,
            kind: 'COMPLETION_PIN',
            urlOrData: 'pin-set',
            notes: req.body.notes,
            actorId: req.auth!.profileId,
            actorRole: req.auth!.role
          }
        });
        return res.status(201).json(row);
      }

      if (!req.body.dataUrl && !req.body.notes) {
        throw new HttpError(400, 'dataUrl or notes required');
      }

      let urlOrData = req.body.notes || 'note';
      if (req.body.dataUrl) {
        ensureStorageDir();
        const filename = `${bookingId}_${req.body.kind}_${randomBytes(6).toString('hex')}.txt`;
        const full = join(env.EVIDENCE_STORAGE_DIR, filename);
        writeFileSync(full, req.body.dataUrl, 'utf8');
        urlOrData = full;
      }

      const row = await prisma.bookingEvidence.create({
        data: {
          bookingId,
          kind: req.body.kind,
          urlOrData,
          notes: req.body.notes,
          actorId: req.auth!.profileId,
          actorRole: req.auth!.role
        }
      });
      res.status(201).json(row);
    } catch (error) {
      next(error);
    }
  }
);

export async function assertWashCompletable(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (!booking.serviceSlug.includes('wash') && booking.serviceSlug !== 'car-wash') {
    return;
  }
  // Demo mode skips full evidence enforcement so local E2E can complete washes.
  if (env.demoMode) return;

  const evidence = await prisma.bookingEvidence.findMany({ where: { bookingId } });
  const kinds = new Set(evidence.map((e) => e.kind));
  if (!kinds.has('BEFORE') || !kinds.has('AFTER')) {
    throw new HttpError(400, 'Wash completion requires BEFORE and AFTER evidence');
  }
  if (!booking.completionPinHash) {
    throw new HttpError(400, 'Wash completion requires customer PIN');
  }
}
