import rateLimit from 'express-rate-limit';
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

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth', 15 * 60 * 1000),
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many authentication attempts. Try again later.' }
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api', 60 * 1000),
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many requests. Slow down.' }
});
