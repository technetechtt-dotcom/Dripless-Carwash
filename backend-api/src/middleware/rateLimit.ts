import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { getRedis } from '../lib/redis.js';

function createRedisStore(prefix: string, windowMs: number) {
  return {
    async increment(key: string) {
      const redis = await getRedis();
      const namespaced = `${prefix}:${key}`;
      const totalHits = await redis.incr(`rl:${namespaced}`);
      if (totalHits === 1) await redis.expire(`rl:${namespaced}`, Math.ceil(windowMs / 1000));
      return { totalHits, resetTime: new Date(Date.now() + windowMs) };
    },
    async decrement(key: string) {
      const redis = await getRedis();
      const namespaced = `${prefix}:${key}`;
      await redis.decr(`rl:${namespaced}`);
    },
    async resetKey(key: string) {
      const redis = await getRedis();
      await redis.del(`rl:${prefix}:${key}`);
    }
  };
}

/** Long-lived SSE and probes must not consume the shared API budget. */
function skipInfrastructurePaths(req: Request) {
  const path = req.path;
  return (
    path === '/health' ||
    path === '/ready' ||
    path === '/events/stream' ||
    req.method === 'OPTIONS'
  );
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth', 15 * 60 * 1000),
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many authentication attempts. Try again later.' }
});

// Ops dashboard alone can fire ~10 parallel GETs + SSE reconnects + Customer/Driver tabs.
// Keep production protective; loosen local/demo so one browser does not trip 429 storms.
const apiWindowMs = 60 * 1000;
const apiMax = env.isProduction ? 300 : 5_000;

export const apiRateLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api', apiWindowMs),
  skip: skipInfrastructurePaths,
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many requests. Slow down.' }
});
