import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './auth/routes.js';
import { mfaRouter } from './auth/mfaRoutes.js';
import { bookingsRouter } from './bookings/routes.js';
import { driversRouter } from './drivers/routes.js';
import { driverOnboardingRouter } from './drivers/onboarding.js';
import { opsRouter } from './ops/routes.js';
import { specialsOpsRouter, specialsPublicRouter } from './specials/routes.js';
import { paymentsRouter } from './payments/routes.js';
import { evidenceRouter } from './evidence/routes.js';
import { walletRouter } from './wallet/routes.js';
import { payoutsRouter } from './payouts/routes.js';
import { customersRouter } from './customers/routes.js';
import { privacyRouter } from './privacy/routes.js';
import { catalogRouter } from './catalog/routes.js';
import { fleetRouter } from './fleet/routes.js';
import { subscriptionsRouter } from './subscriptions/routes.js';
import { impactRouter } from './impact/routes.js';
import { complaintsRouter } from './complaints/routes.js';
import { notificationsRouter } from './notifications/routes.js';
import { prisma } from './db/prisma.js';
import { authRequired } from './middleware/auth.js';
import { redisHealth } from './lib/redis.js';
import { jobStats } from './lib/queue.js';
import { subscribeSse } from './lib/events.js';

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...env.corsOrigins],
          formAction: ["'self'"]
        }
      }
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

  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  app.get('/health', async (_req, res) => {
    const redis = await redisHealth();
    res.json({
      ok: true,
      demoMode: env.demoMode,
      env: env.NODE_ENV,
      redisConfigured: redis.configured,
      redisOk: redis.ok,
      paymentsProvider: env.PAYMENTS_PROVIDER
    });
  });

  app.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const jobs = await jobStats();
      res.json({ ok: true, jobs });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Dripless Backend API',
      version: '1.0.0',
      demoMode: env.demoMode
    });
  });

  app.get('/events/stream', authRequired, (req, res) => {
    subscribeSse(res, String(req.headers['last-event-id'] || req.query.lastEventId || ''));
  });

  app.use('/auth', authRouter);
  app.use('/auth/mfa', mfaRouter);
  app.use('/bookings', bookingsRouter);
  app.use('/bookings', evidenceRouter);
  app.use('/driver', driversRouter);
  app.use('/driver', driverOnboardingRouter);
  app.use('/ops', opsRouter);
  app.use('/specials', specialsPublicRouter);
  app.use('/ops/specials', specialsOpsRouter);
  app.use('/payments', paymentsRouter);
  app.use('/wallet', walletRouter);
  app.use('/payouts', payoutsRouter);
  app.use('/customers', customersRouter);
  app.use('/privacy', privacyRouter);
  app.use('/catalog', catalogRouter);
  app.use('/fleet', fleetRouter);
  app.use('/subscriptions', subscriptionsRouter);
  app.use('/impact', impactRouter);
  app.use('/complaints', complaintsRouter);
  app.use('/notifications', notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
