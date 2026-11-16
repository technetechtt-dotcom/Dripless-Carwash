import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { hashToken, issueSessionTokens, revokeUserSessions } from './tokens.js';
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

/** Prepare TOTP enrollment for an authenticated ops administrator. */
mfaRouter.post(
  '/setup',
  authRequired,
  roleRequired(['ops_admin']),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: { opsProfile: { id: req.auth!.profileId } },
        include: { opsProfile: true }
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
        where: { opsProfile: { id: req.auth!.profileId } },
        include: { opsProfile: true }
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
      await revokeUserSessions(user.id);
      const tokens = await issueSessionTokens(user.id, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        authMethod: 'TOTP',
        mfaVerified: true
      });
      res.json({
        enabled: true,
        backupCodes,
        session: {
          tokens,
          payload: {
            userId: user.id,
            role: user.role,
            email: user.email,
            emailVerified: Boolean(user.emailVerifiedAt),
            mustChangePassword: user.mustChangePassword
          }
        },
        profile: user.opsProfile ? { ...user.opsProfile, email: user.email } : null,
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

mfaRouter.post(
  '/backup-codes/regenerate',
  authRequired,
  roleRequired(['ops_admin']),
  validate(z.object({ token: z.string().min(6).max(12) })),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
      if (!user?.mfaEnabled || !user.mfaSecretEnc) throw new HttpError(400, 'MFA is not enabled');
      if (!verifyTotp(decryptSecret(user.mfaSecretEnc), req.body.token)) {
        throw new HttpError(401, 'A current authenticator code is required');
      }
      const backupCodes = generateBackupCodes();
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { mfaBackupCodesHash: backupCodes.map(hashBackupCode) }
        }),
        prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: 'ops_admin',
            action: 'MFA_BACKUP_CODES_REGENERATED',
            targetId: user.id,
            message: 'Ops administrator regenerated MFA backup codes'
          }
        })
      ]);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ backupCodes, message: 'Previous backup codes have been revoked.' });
    } catch (error) { next(error); }
  }
);

mfaRouter.post(
  '/challenge',
  authRateLimiter,
  validate(
    z.object({
      mfaToken: z.string().min(10),
      token: z.string().min(6).max(16)
    })
  ),
  async (req, res, next) => {
    try {
      const tokenHash = hashToken(req.body.mfaToken);
      const challenge = await prisma.mfaChallenge.findUnique({
        where: { tokenHash },
        include: { user: { include: { customerProfile: true, driverProfile: true, opsProfile: true } } }
      });
      if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
        throw new HttpError(401, 'Invalid MFA challenge');
      }
      const user = challenge.user;
      if (!user.mfaSecretEnc) throw new HttpError(400, 'MFA is not configured');
      const secret = decryptSecret(user.mfaSecretEnc);
      const totpOk = verifyTotp(secret, req.body.token);
      const backupOk = user.mfaBackupCodesHash.includes(hashBackupCode(req.body.token));
      if (!totpOk && !backupOk) throw new HttpError(401, 'Invalid MFA token');
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.mfaChallenge.updateMany({
          where: { id: challenge.id, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedAt: new Date() }
        });
        if (claimed.count !== 1) throw new HttpError(401, 'Invalid MFA challenge');
        if (backupOk) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              mfaBackupCodesHash: user.mfaBackupCodesHash.filter(
                (row) => row !== hashBackupCode(req.body.token)
              )
            }
          });
        }
      });
      const tokens = await issueSessionTokens(user.id, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        authMethod: 'TOTP',
        mfaVerified: true
      });
      const profile =
        user.role === 'customer'
          ? user.customerProfile
          : user.role === 'driver'
            ? user.driverProfile
            : user.opsProfile;
      res.json({
        session: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            refreshExpiresAt: tokens.refreshExpiresAt
          },
          payload: {
            userId: user.id,
            role: user.role,
            email: user.email,
            emailVerified: Boolean(user.emailVerifiedAt),
            mustChangePassword: user.mustChangePassword
          }
        },
        profile
      });
    } catch (error) {
      next(error);
    }
  }
);
mfaRouter.get('/webauthn/status', authRequired, roleRequired(['ops_admin']), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { opsProfile: { id: req.auth!.profileId } },
      include: { webAuthnCredentials: true }
    });
    res.json({
      implemented: true,
      credentials: user?.webAuthnCredentials.length ?? 0,
      message: 'Passkey registration and user-verified authentication are available at /auth/passkeys.'
    });
  } catch (error) {
    next(error);
  }
});
