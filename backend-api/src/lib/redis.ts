import { env } from '../config/env.js';
import { logger } from './logger.js';

type MemoryEntry = { value: string; expiresAt: number | null };

const memory = new Map<string, MemoryEntry>();

class MemoryRedis {
  async get(key: string): Promise<string | null> {
    const row = memory.get(key);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return row.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    const expiresAt =
      mode === 'EX' && typeof ttl === 'number' ? Date.now() + ttl * 1000 : null;
    memory.set(key, { value, expiresAt });
    return 'OK';
  }

  async setnx(key: string, value: string): Promise<number> {
    await this.get(key);
    if (memory.has(key)) return 0;
    memory.set(key, { value, expiresAt: null });
    return 1;
  }

  async setNxEx(key: string, value: string, seconds: number): Promise<boolean> {
    await this.get(key);
    if (memory.has(key)) return false;
    memory.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return true;
  }

  async deleteIfValue(key: string, value: string): Promise<boolean> {
    const current = await this.get(key);
    if (current !== value) return false;
    memory.delete(key);
    return true;
  }

  async del(key: string): Promise<number> {
    return memory.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) || '0') + 1;
    await this.set(key, String(current));
    return current;
  }

  async decr(key: string): Promise<number> {
    const current = Math.max(0, Number((await this.get(key)) || '0') - 1);
    const row = memory.get(key);
    memory.set(key, { value: String(current), expiresAt: row?.expiresAt ?? null });
    return current;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const row = memory.get(key);
    if (!row) return 0;
    row.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<void> {
    memory.clear();
  }
}

type RedisLike = MemoryRedis;

let client: RedisLike | null = null;
export function redisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

export async function getRedis(): Promise<RedisLike> {
  if (client) return client;
  if (env.REDIS_URL) {
    try {
      const { default: IORedis } = (await import('ioredis')) as unknown as {
        default: new (url: string, opts?: object) => {
          connect: () => Promise<void>;
          get: (key: string) => Promise<string | null>;
          set: (...args: unknown[]) => Promise<'OK'>;
          setnx: (key: string, value: string) => Promise<number>;
          del: (key: string) => Promise<number>;
          incr: (key: string) => Promise<number>;
          decr: (key: string) => Promise<number>;
          expire: (key: string, seconds: number) => Promise<number>;
          ping: () => Promise<string>;
          quit: () => Promise<unknown>;
          eval: (script: string, numberOfKeys: number, ...args: string[]) => Promise<number>;
        };
      };
      const io = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
      await io.connect();
      client = {
        get: (key) => io.get(key),
        set: (key, value, mode, ttl) =>
          mode === 'EX' && ttl ? io.set(key, value, 'EX', ttl) : io.set(key, value),
        setnx: (key, value) => io.setnx(key, value),
        setNxEx: async (key, value, seconds) =>
          (await io.set(key, value, 'EX', seconds, 'NX')) === 'OK',
        deleteIfValue: async (key, value) =>
          (await io.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1,
            key,
            value
          )) === 1,
        del: (key) => io.del(key),
        incr: (key) => io.incr(key),
        decr: (key) => io.decr(key),
        expire: (key, seconds) => io.expire(key, seconds),
        ping: () => io.ping(),
        quit: () => io.quit().then(() => undefined)
      } as MemoryRedis;
      logger.info('redis_connected');
      return client;
    } catch (error) {
      if (env.isProduction) throw error;
      logger.warn('redis_unavailable_using_memory', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  if (env.isProduction) throw new Error('Redis is required in production');
  client = new MemoryRedis();
  return client;
}

export async function redisHealth(): Promise<{ configured: boolean; ok: boolean }> {
  const configured = redisConfigured();
  try {
    const r = await getRedis();
    const pong = await r.ping();
    return { configured, ok: pong === 'PONG' };
  } catch {
    return { configured, ok: false };
  }
}
