import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './auth/routes.js';
import { bookingsRouter } from './bookings/routes.js';
import { driversRouter } from './drivers/routes.js';
import { opsRouter } from './ops/routes.js';
import { specialsOpsRouter, specialsPublicRouter } from './specials/routes.js';
import { prisma } from './db/prisma.js';
import { authRequired } from './middleware/auth.js';

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

  app.use(express.json({ limit: '200kb' }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      demoMode: env.demoMode,
      env: env.NODE_ENV
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Dripless Backend API',
      version: '0.2.0',
      demoMode: env.demoMode
    });
  });

  app.use('/auth', authRouter);
  app.use('/bookings', bookingsRouter);
  app.use('/driver', driversRouter);
  app.use('/ops', opsRouter);
  app.use('/specials', specialsPublicRouter);
  app.use('/ops/specials', specialsOpsRouter);

  app.get('/notifications', authRequired, async (req, res, next) => {
    try {
      const rows = await prisma.notification.findMany({
        where: {
          OR: [{ userId: req.auth!.profileId }, { role: req.auth!.role }]
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
