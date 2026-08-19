import * as Sentry from '@sentry/node';
import type { Express } from 'express';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let initialized = false;

export function initializeMonitoring() {
  if (initialized || !env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: env.isProduction ? 0.1 : 0
  });
  initialized = true;
}

export function attachMonitoringErrorHandler(app: Express) {
  if (initialized) Sentry.setupExpressErrorHandler(app);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (initialized) Sentry.captureException(error, { extra: context });
  logger.error('captured_exception', {
    error: error instanceof Error ? error.message : String(error),
    ...context
  });
}

export async function sendOperationalAlert(
  type: 'payment_failure' | 'dispatch_failure' | 'reconciliation_failure' | 'dead_job',
  message: string,
  details?: Record<string, unknown>
) {
  logger.error(type, { message, ...details });
  if (!env.ALERT_WEBHOOK_URL) return;
  const response = await fetch(env.ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'dripless-api',
      environment: env.NODE_ENV,
      type,
      message,
      details,
      occurredAt: new Date().toISOString()
    })
  });
  if (!response.ok) logger.error('alert_delivery_failed', { type, status: response.status });
}
