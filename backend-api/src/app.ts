import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './auth/routes.js';
import { mfaRouter } from './auth/mfaRoutes.js';
import { bookingsRouter } from './bookings/routes.js';
import { driversRouter } from './drivers/routes.js';
import { opsRouter } from './ops/routes.js';
import { specialsOpsRouter, specialsPublicRouter } from './specials/routes.js';
import { paymentsRouter } from './payments/routes.js';
import { evidenceRouter } from './evidence/routes.js';
import { prisma } from './db/prisma.js';
import { authRequired } from './middleware/auth.js';
import { validate } from './middleware/validate.js';
import { HttpError } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      demoMode: env.demoMode,
      env: env.NODE_ENV,
      redisConfigured: Boolean(env.REDIS_URL),
      paymentsProvider: env.PAYMENTS_PROVIDER
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Dripless Backend API',
      version: '0.3.0',
      demoMode: env.demoMode
    });
  });

  app.use('/auth', authRouter);
  app.use('/auth/mfa', mfaRouter);
  app.use('/bookings', bookingsRouter);
  app.use('/bookings', evidenceRouter);
  app.use('/driver', driversRouter);
  app.use('/ops', opsRouter);
  app.use('/specials', specialsPublicRouter);
  app.use('/ops/specials', specialsOpsRouter);
  app.use('/payments', paymentsRouter);

  app.get('/notifications', authRequired, async (req, res, next) => {
    try {
      const rows = await prisma.notification.findMany({
        where: {
          OR: [{ userId: req.auth!.profileId }, { role: req.auth!.role }]
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(
        rows.map((row) => ({
          id: row.id,
          role: row.role,
          userId: row.userId,
          title: row.title,
          message: row.message,
          type: row.type,
          read: row.read,
          createdAt: row.createdAt.toISOString()
        }))
      );
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/notifications',
    authRequired,
    validate(
      z.object({
        title: z.string().min(1).max(120),
        message: z.string().min(1).max(2000),
        type: z.enum(['info', 'warning', 'success', 'error']).optional(),
        role: z.enum(['customer', 'driver', 'ops_admin']).optional(),
        userId: z.string().optional()
      })
    ),
    async (req, res, next) => {
      try {
        const targetUserId = req.body.userId || req.auth!.profileId;
        if (req.auth!.role !== 'ops_admin' && targetUserId !== req.auth!.profileId) {
          throw new HttpError(403, 'Cannot create notifications for other users');
        }
        const row = await prisma.notification.create({
          data: {
            title: req.body.title,
            message: req.body.message,
            type: req.body.type || 'info',
            role: req.body.role || req.auth!.role,
            userId: targetUserId
          }
        });
        res.status(201).json({
          id: row.id,
          role: row.role,
          userId: row.userId,
          title: row.title,
          message: row.message,
          type: row.type,
          read: row.read,
          createdAt: row.createdAt.toISOString()
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
