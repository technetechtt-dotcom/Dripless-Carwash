import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import {
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  totpOtpauthUrl,
  verifyTotp
} from './mfa.js';

export const mfaRouter = Router();

/** Scaffold: prepare TOTP enrollment for ops admins (full UX deferred). */
mfaRouter.post(
  '/setup',
  authRequired,
  roleRequired(['ops_admin']),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: { opsProfile: { id: req.auth!.profileId } }
      });
      if (!user) throw new HttpError(404, 'User not found');
      const secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaSecretEnc: encryptSecret(secret),
          mfaEnabled: false
        }
      });
      res.json({
        status: 'pending_verification',
        otpauthUrl: totpOtpauthUrl(user.email, secret),
        secret,
        message: 'Scan otpauthUrl with an authenticator app, then call /auth/mfa/verify'
      });
    } catch (error) {
      next(error);
    }
  }
);

mfaRouter.post(
  '/verify',
  authRequired,
  roleRequired(['ops_admin']),
  validate(z.object({ token: z.string().min(6).max(12) })),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: { opsProfile: { id: req.auth!.profileId } }
      });
      if (!user?.mfaSecretEnc) throw new HttpError(400, 'MFA setup not started');
      const secret = decryptSecret(user.mfaSecretEnc);
      if (!verifyTotp(secret, req.body.token)) {
        throw new HttpError(401, 'Invalid MFA token');
      }
      const backupCodes = generateBackupCodes();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaBackupCodesHash: backupCodes.map(hashBackupCode)
        }
      });
      res.json({
        enabled: true,
        backupCodes,
        message: 'MFA enabled. Store backup codes securely; they are shown once.'
      });
    } catch (error) {
      next(error);
    }
  }
);

mfaRouter.post(
  '/disable',
  authRequired,
  roleRequired(['ops_admin']),
  validate(z.object({ token: z.string().min(6).max(16) })),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: { opsProfile: { id: req.auth!.profileId } }
      });
      if (!user?.mfaEnabled || !user.mfaSecretEnc) {
        throw new HttpError(400, 'MFA is not enabled');
      }
      const secret = decryptSecret(user.mfaSecretEnc);
      const token = String(req.body.token);
      const totpOk = verifyTotp(secret, token);
      const backupOk = user.mfaBackupCodesHash.includes(hashBackupCode(token));
      if (!totpOk && !backupOk) throw new HttpError(401, 'Invalid MFA token');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: false,
          mfaSecretEnc: null,
          mfaBackupCodesHash: []
        }
      });
      res.json({ enabled: false });
    } catch (error) {
      next(error);
    }
  }
);

/** Placeholder for WebAuthn MFA UX (schema exists; full ceremony deferred). */
mfaRouter.get('/webauthn/status', authRequired, roleRequired(['ops_admin']), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { opsProfile: { id: req.auth!.profileId } },
      include: { webAuthnCredentials: true }
    });
    res.json({
      implemented: false,
      credentials: user?.webAuthnCredentials.length ?? 0,
      message: 'WebAuthn registration/assertion endpoints planned; use TOTP for now.'
    });
  } catch (error) {
    next(error);
  }
});
