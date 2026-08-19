import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './auth/routes.js';
import { mfaRouter } from './auth/mfaRoutes.js';
import { passkeyRouter } from './auth/passkeyRoutes.js';
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
import { logger } from './lib/logger.js';
import { subscribeSse } from './lib/events.js';
import { geoRouter } from './geo/routes.js';
import { invoicesRouter } from './invoices/routes.js';
import { attachMonitoringErrorHandler, initializeMonitoring } from './lib/monitoring.js';

export function createApp() {
  initializeMonitoring();
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

  app.use(
    express.json({
      limit: '8mb',
      verify(req, _res, buffer) {
        (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  app.get('/health', async (_req, res) => {
    const redis = await redisHealth();
    const checks: Record<string, boolean | string> = {
      redis: redis.ok,
      redisConfigured: redis.configured,
      paymentsProvider: env.PAYMENTS_PROVIDER,
      geocoderProvider: env.GEOCODER_PROVIDER,
      evidenceStorage: env.EVIDENCE_STORAGE_PROVIDER,
      mfaRequired: env.MFA_REQUIRED_OPS || false,
      demoMode: env.demoMode,
      env: env.NODE_ENV
    };
    // In production, all critical services must be up
    const healthy = !env.isProduction || (redis.ok && redis.configured);
    res.status(healthy ? 200 : 503).json({ ok: healthy, checks });
  });

  app.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redis = await redisHealth();
      const jobs = await jobStats();
      const deadThreshold = 5;
      const tooManyDead = jobs.dead >= deadThreshold;
      if (tooManyDead) {
        // Log but don't fail readiness — dead jobs need alerting, not traffic shedding
        logger.warn('ready_check_dead_jobs', { dead: jobs.dead, threshold: deadThreshold });
      }
      res.json({
        ok: true,
        db: 'up',
        redis: redis.ok ? 'up' : 'down',
        jobs,
        deadJobAlert: tooManyDead
      });
    } catch (error) {
      logger.error('ready_check_failed', { error: String(error) });
      res.status(503).json({ ok: false, error: 'Database unavailable' });
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
  app.use('/auth/passkeys', passkeyRouter);
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
  app.use('/geo', geoRouter);
  app.use('/invoices', invoicesRouter);

  attachMonitoringErrorHandler(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
