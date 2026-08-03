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

export async function issueSessionTokens(userId: string) {
  const accessToken = generateOpaqueToken(32);
  const refreshToken = generateOpaqueToken(48);
  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);
  const accessExp = accessExpiresAt();
  const refreshExp = refreshExpiresAt();

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId,
        accessTokenHash,
        expiresAt: accessExp
      }
    }),
    prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExp
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

  const next = await issueSessionTokens(existing.userId);
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
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
