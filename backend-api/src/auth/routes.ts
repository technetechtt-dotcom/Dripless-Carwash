import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/error.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  generateOpaqueToken,
  hashToken,
  issueSessionTokens,
  revokeAccessToken,
  revokeUserSessions,
  rotateRefreshToken
} from './tokens.js';
import {
  customerSignupSchema,
  driverSignupSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshSchema,
  verifyEmailSchema
} from './schemas.js';
import { computeLockUntil, progressiveDelayMs, sleep } from './lockout.js';
import { authRequired } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { mapCustomerProfile, mapDriverProfile } from '../dto/mappers.js';

export const authRouter = Router();

function mapProfileForClient(
  user: { email: string; role: 'customer' | 'driver' | 'ops_admin' },
  profile: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!profile) return null;
  const base: Record<string, unknown> = {
    ...profile,
    email: user.email,
    createdAt:
      profile.createdAt instanceof Date
        ? profile.createdAt.toISOString()
        : profile.createdAt,
    updatedAt:
      profile.updatedAt instanceof Date
        ? profile.updatedAt.toISOString()
        : profile.updatedAt
  };
  if (user.role === 'driver' && profile.memberSince instanceof Date) {
    base.memberSince = profile.memberSince.toISOString().slice(0, 10);
  }
  return base;
}

function toSessionResponse(
  user: {
    id: string;
    email: string;
    role: 'customer' | 'driver' | 'ops_admin';
    emailVerifiedAt: Date | null;
    mustChangePassword: boolean;
  },
  tokens: Awaited<ReturnType<typeof issueSessionTokens>>,
  profile: Record<string, unknown> | null
) {
  const mapped = mapProfileForClient(user, profile);
  return {
    session: {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt
      },
      payload: {
        userId: typeof mapped?.id === 'string' ? mapped.id : user.id,
        role: user.role,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
        mustChangePassword: user.mustChangePassword
      }
    },
    profile: mapped
  };
}

async function createEmailVerificationToken(userId: string) {
  const token = generateOpaqueToken(32);
  await prisma.emailToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000)
    }
  });
  return token;
}

async function handleLogin(
  email: string,
  password: string,
  expectedRole: 'customer' | 'driver' | 'ops_admin'
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      customerProfile: true,
      driverProfile: true,
      opsProfile: true
    }
  });

  if (!user || user.role !== expectedRole) {
    await sleep(300);
    throw new HttpError(401, 'Invalid credentials');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(423, 'Account temporarily locked. Try again later.');
  }

  await sleep(progressiveDelayMs(user.failedLoginCount));

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = computeLockUntil(failedLoginCount);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount, lockedUntil }
    });
    throw new HttpError(401, 'Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
  });

  const profile =
    expectedRole === 'customer'
      ? user.customerProfile
      : expectedRole === 'driver'
        ? user.driverProfile
        : user.opsProfile;

  if (!profile) {
    throw new HttpError(500, 'Profile missing');
  }

  if (user.mfaEnabled) {
    const token = generateOpaqueToken(24);
    await prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 5 * 60_000)
      }
    });
    return {
      mfaRequired: true,
      mfaToken: token,
      email: user.email,
      role: user.role
    };
  }

  if (expectedRole === 'ops_admin' && env.isProduction && !env.demoMode && !user.mfaEnabled) {
    const tokens = await issueSessionTokens(user.id);
    return {
      ...toSessionResponse(user, tokens, profile as unknown as Record<string, unknown>),
      mustEnableMfa: true
    };
  }

  const tokens = await issueSessionTokens(user.id);
  return toSessionResponse(user, tokens, profile as unknown as Record<string, unknown>);
}

authRouter.post(
  '/customer/signup',
  authRateLimiter,
  validate(customerSignupSchema),
  async (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, 'Account already exists');

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'customer',
          emailVerifiedAt: env.demoMode ? new Date() : null,
          customerProfile: {
            create: {
              id: `customer_${Date.now().toString(36)}`,
              name,
              phone,
              referralCode: `C${Date.now().toString(36).toUpperCase()}`
            }
          }
        },
        include: { customerProfile: true }
      });

      const verificationToken = env.demoMode
        ? null
        : await createEmailVerificationToken(user.id);
      const tokens = await issueSessionTokens(user.id);

      res.status(201).json({
        ...toSessionResponse(
          user,
          tokens,
          user.customerProfile as unknown as Record<string, unknown>
        ),
        verificationToken: env.demoMode ? undefined : verificationToken
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/driver/signup',
  authRateLimiter,
  validate(driverSignupSchema),
  async (req, res, next) => {
    try {
      const { name, email, password, vehicle, phone, plateNumber } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, 'Account already exists');

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'driver',
          emailVerifiedAt: env.demoMode ? new Date() : null,
          driverProfile: {
            create: {
              id: `driver_${Date.now().toString(36)}`,
              name,
              phone,
              vehicle,
              plateNumber,
              status: 'PENDING_REVIEW',
              verificationStatus: 'PENDING'
            }
          }
        },
        include: { driverProfile: true }
      });

      const verificationToken = env.demoMode
        ? null
        : await createEmailVerificationToken(user.id);
      const tokens = await issueSessionTokens(user.id);
      res.status(201).json({
        ...toSessionResponse(
          user,
          tokens,
          user.driverProfile as unknown as Record<string, unknown>
        ),
        verificationToken: env.demoMode ? undefined : verificationToken
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/customer/login',
  authRateLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      res.json(await handleLogin(req.body.email, req.body.password, 'customer'));
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/driver/login',
  authRateLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      res.json(await handleLogin(req.body.email, req.body.password, 'driver'));
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/ops-admin/login',
  authRateLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      if (req.body.password.length < 8) {
        throw new HttpError(400, 'Invalid admin credentials');
      }
      res.json(await handleLogin(req.body.email, req.body.password, 'ops_admin'));
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/refresh',
  authRateLimiter,
  validate(refreshSchema),
  async (req, res, next) => {
    try {
      const rotated = await rotateRefreshToken(req.body.refreshToken);
      if (!rotated) throw new HttpError(401, 'Invalid refresh token');
      const profile =
        rotated.user.role === 'customer'
          ? await prisma.customerProfile.findUnique({ where: { userId: rotated.user.id } })
          : rotated.user.role === 'driver'
            ? await prisma.driverProfile.findUnique({ where: { userId: rotated.user.id } })
            : await prisma.opsAdminProfile.findUnique({ where: { userId: rotated.user.id } });
      res.json(
        toSessionResponse(
          rotated.user,
          rotated.tokens,
          profile as unknown as Record<string, unknown> | null
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post('/logout', authRequired, async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await revokeAccessToken(header.slice(7));
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout-all', authRequired, async (req, res, next) => {
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
    if (user) await revokeUserSessions(user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  '/verify-email',
  authRateLimiter,
  validate(verifyEmailSchema),
  async (req, res, next) => {
    try {
      const tokenHash = hashToken(req.body.token);
      const record = await prisma.emailToken.findUnique({ where: { tokenHash } });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new HttpError(400, 'Invalid or expired verification token');
      }
      await prisma.$transaction([
        prisma.emailToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() }
        }),
        prisma.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: new Date() }
        })
      ]);
      res.json({ message: 'Email verified' });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/password-reset/request',
  authRateLimiter,
  validate(passwordResetRequestSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: req.body.email } });
      // Always return success to avoid account enumeration
      if (user) {
        const token = generateOpaqueToken(32);
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 60 * 60_000)
          }
        });
        if (env.demoMode) {
          return res.json({ message: 'Password reset token issued', resetToken: token });
        }
        const { enqueue } = await import('../lib/queue.js');
        await enqueue('email.send', {
          to: user.email,
          subject: 'Reset your Dripless password',
          text: 'A password reset was requested. Use the link from your Dripless app.'
        });
      }
      res.json({ message: 'If the account exists, a reset email was sent' });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/password-reset/confirm',
  authRateLimiter,
  validate(passwordResetConfirmSchema),
  async (req, res, next) => {
    try {
      const tokenHash = hashToken(req.body.token);
      const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new HttpError(400, 'Invalid or expired reset token');
      }
      const passwordHash = await hashPassword(req.body.password);
      await prisma.$transaction([
        prisma.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() }
        }),
        prisma.user.update({
          where: { id: record.userId },
          data: {
            passwordHash,
            mustChangePassword: false,
            failedLoginCount: 0,
            lockedUntil: null
          }
        })
      ]);
      await revokeUserSessions(record.userId);
      res.json({ message: 'Password updated' });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/phone/request',
  authRequired,
  authRateLimiter,
  validate(z.object({ phone: z.string().min(7).max(32) })),
  async (req, res, next) => {
    try {
      const code = env.demoMode ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
      await prisma.phoneOtp.create({
        data: {
          phone: req.body.phone,
          userId: (
            await prisma.user.findFirstOrThrow({
              where: {
                OR: [
                  { customerProfile: { id: req.auth!.profileId } },
                  { driverProfile: { id: req.auth!.profileId } }
                ]
              }
            })
          ).id,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + 10 * 60_000)
        }
      });
      const { enqueue } = await import('../lib/queue.js');
      await enqueue('sms.send', { to: req.body.phone, body: `Dripless code: ${code}` });
      res.json({ message: 'OTP sent', demoCode: env.demoMode ? code : undefined });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/phone/verify',
  authRequired,
  authRateLimiter,
  validate(z.object({ phone: z.string().min(7).max(32), code: z.string().min(4).max(8) })),
  async (req, res, next) => {
    try {
      const record = await prisma.phoneOtp.findFirst({
        where: {
          phone: req.body.phone,
          codeHash: hashToken(req.body.code),
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (!record) throw new HttpError(400, 'Invalid or expired code');
      await prisma.phoneOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      if (record.userId) {
        await prisma.user.update({
          where: { id: record.userId },
          data: { phoneVerifiedAt: new Date() }
        });
      }
      res.json({ message: 'Phone verified' });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.get('/me', authRequired, async (req, res, next) => {
  try {
    if (req.auth!.role === 'customer') {
      const profile = await prisma.customerProfile.findUnique({
        where: { id: req.auth!.profileId },
        include: { user: true }
      });
      return res.json(profile ? mapCustomerProfile(profile) : null);
    }
    if (req.auth!.role === 'driver') {
      const profile = await prisma.driverProfile.findUnique({
        where: { id: req.auth!.profileId },
        include: { user: true, location: true }
      });
      return res.json(profile ? mapDriverProfile(profile) : null);
    }
    const profile = await prisma.opsAdminProfile.findUnique({
      where: { id: req.auth!.profileId }
    });
    return res.json(profile);
  } catch (error) {
    next(error);
  }
});
