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
    if (memory.has(key)) return 0;
    memory.set(key, { value, expiresAt: null });
    return 1;
  }

  async del(key: string): Promise<number> {
    return memory.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) || '0') + 1;
    await this.set(key, String(current));
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
let remote: { ping: () => Promise<string>; quit: () => Promise<void>; get: Function; set: Function; del: Function; incr: Function; expire: Function; setnx?: Function } | null = null;

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
          expire: (key: string, seconds: number) => Promise<number>;
          ping: () => Promise<string>;
          quit: () => Promise<unknown>;
        };
      };
      const io = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
      await io.connect();
      remote = io as unknown as typeof remote;
      client = {
        get: (key) => io.get(key),
        set: (key, value, mode, ttl) =>
          mode === 'EX' && ttl ? io.set(key, value, 'EX', ttl) : io.set(key, value),
        setnx: (key, value) => io.setnx(key, value),
        del: (key) => io.del(key),
        incr: (key) => io.incr(key),
        expire: (key, seconds) => io.expire(key, seconds),
        ping: () => io.ping(),
        quit: () => io.quit().then(() => undefined)
      } as MemoryRedis;
      logger.info('redis_connected');
      return client;
    } catch (error) {
      logger.warn('redis_unavailable_using_memory', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
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
