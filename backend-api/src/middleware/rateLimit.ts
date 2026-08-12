import rateLimit from 'express-rate-limit';
import { getRedis } from '../lib/redis.js';

function createRedisStore(prefix: string) {
  return {
    async increment(key: string) {
      const redis = await getRedis();
      const namespaced = `${prefix}:${key}`;
      const totalHits = await redis.incr(`rl:${namespaced}`);
      if (totalHits === 1) await redis.expire(`rl:${namespaced}`, 60);
      return { totalHits, resetTime: new Date(Date.now() + 60_000) };
    },
    async decrement(key: string) {
      const redis = await getRedis();
      const namespaced = `${prefix}:${key}`;
      const current = Number((await redis.get(`rl:${namespaced}`)) || '1');
      await redis.set(`rl:${namespaced}`, String(Math.max(0, current - 1)));
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
  store: createRedisStore('auth'),
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many authentication attempts. Try again later.' }
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  validate: { xForwardedForHeader: false, singleCount: false },
  message: { message: 'Too many requests. Slow down.' }
});
