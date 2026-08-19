import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { hashToken } from '../auth/tokens.js';
import { HttpError } from './error.js';
import { env } from '../config/env.js';

export type AuthPayload = {
  userId: string;
  role: UserRole;
  email: string;
  profileId: string;
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      requestId?: string;
      rawBody?: Buffer;
    }
  }
}

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing token');
    }
    const raw = header.slice('Bearer '.length).trim();
    const session = await prisma.session.findUnique({
      where: { accessTokenHash: hashToken(raw) },
      include: {
        user: {
          include: {
            customerProfile: true,
            driverProfile: true,
            opsProfile: true
          }
        }
      }
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const user = session.user;
    const profileId =
      user.role === 'customer'
        ? user.customerProfile?.id
        : user.role === 'driver'
          ? user.driverProfile?.id
          : user.opsProfile?.id;

    if (!profileId) {
      throw new HttpError(401, 'Profile missing for authenticated user');
    }
    if (
      env.isProduction &&
      env.MFA_REQUIRED_OPS &&
      user.role === 'ops_admin' &&
      !session.mfaVerifiedAt &&
      !['/auth/mfa', '/auth/passkeys'].includes(req.baseUrl)
    ) {
      throw new HttpError(403, 'Ops MFA enrollment is required');
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      email: user.email,
      profileId,
      permissions: user.opsProfile?.permissions ?? []
    };
    next();
  } catch (error) {
    next(error);
  }
}

export const roleRequired =
  (roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'Forbidden'));
    }
    next();
  };

export const permissionRequired =
  (permission: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.permissions.includes(permission)) {
      return next(new HttpError(403, 'Missing permission'));
    }
    next();
  };
