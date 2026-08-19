import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const generateOpaqueToken = (bytes = 32) =>
  randomBytes(bytes).toString('base64url');

export const accessExpiresAt = () =>
  new Date(Date.now() + env.ACCESS_TOKEN_TTL_MINUTES * 60_000);

export const refreshExpiresAt = () =>
  new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000);

export async function issueSessionTokens(
  userId: string,
  context?: {
    ip?: string;
    userAgent?: string;
    deviceLabel?: string;
    authMethod?: 'PASSWORD' | 'TOTP' | 'PASSKEY' | 'REFRESH';
    mfaVerified?: boolean;
  }
) {
  const accessToken = generateOpaqueToken(32);
  const refreshToken = generateOpaqueToken(48);
  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);
  const accessExp = accessExpiresAt();
  const refreshExp = refreshExpiresAt();
  const mfaVerifiedAt = context?.mfaVerified ? new Date() : null;
  const authMethod = context?.authMethod || 'PASSWORD';

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId,
        accessTokenHash,
        expiresAt: accessExp,
        ipAddress: context?.ip,
        userAgent: context?.userAgent?.slice(0, 500),
        deviceLabel: context?.deviceLabel || context?.userAgent?.slice(0, 120),
        authMethod,
        mfaVerifiedAt
      }
    }),
    prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExp,
        authMethod,
        mfaVerifiedAt
      }
    })
  ]);

  return {
    accessToken,
    refreshToken,
    expiresAt: accessExp.toISOString(),
    refreshExpiresAt: refreshExp.toISOString()
  };
}

export async function rotateRefreshToken(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  const claimed = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { revokedAt: new Date() }
  });
  if (claimed.count !== 1) return null;

  const next = await issueSessionTokens(existing.userId, {
    authMethod: existing.authMethod as 'PASSWORD' | 'TOTP' | 'PASSKEY' | 'REFRESH',
    mfaVerified: Boolean(existing.mfaVerifiedAt)
  });
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: {
      replacedBy: hashToken(next.refreshToken)
    }
  });

  return { user: existing.user, tokens: next };
}

export async function revokeUserSessions(userId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now }
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now }
    })
  ]);
}

export async function revokeAccessToken(rawAccessToken: string) {
  await prisma.session.updateMany({
    where: { accessTokenHash: hashToken(rawAccessToken), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
