import { prisma } from '../db/prisma.js';
import { logger } from './logger.js';
import { getRedis } from './redis.js';
import type { Prisma } from '@prisma/client';
import { sendOperationalAlert } from './monitoring.js';

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();
let workerStarted = false;

export function registerJob(queue: string, handler: JobHandler) {
  handlers.set(queue, handler);
}

export async function enqueue(
  queue: string,
  payload: Record<string, unknown>,
  opts?: { runAt?: Date; maxAttempts?: number }
) {
  return prisma.backgroundJob.create({
    data: {
      queue,
      payload: payload as Prisma.InputJsonValue,
      runAt: opts?.runAt ?? new Date(),
      maxAttempts: opts?.maxAttempts ?? 5
    }
  });
}

export async function enqueueUnique(
  queue: string,
  payload: Record<string, unknown>,
  opts?: { runAt?: Date; maxAttempts?: number }
) {
  const existing = await prisma.backgroundJob.findFirst({
    where: { queue, status: { in: ['PENDING', 'RUNNING', 'FAILED'] } },
    orderBy: { runAt: 'asc' }
  });
  if (existing) return existing;
  return enqueue(queue, payload, opts);
}

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  const redis = await getRedis();
  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  const ok = await redis.setNxEx(`lock:${key}`, token, 30);
  if (!ok) return null;
  try {
    return await fn();
  } finally {
    await redis.deleteIfValue(`lock:${key}`, token);
  }
}

export async function processDueJobs(limit = 10) {
  return withLock('job-worker', async () => {
    const due = await prisma.backgroundJob.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        runAt: { lte: new Date() }
      },
      orderBy: { runAt: 'asc' },
      take: limit
    });

    for (const job of due) {
      const handler = handlers.get(job.queue);
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING', lockedAt: new Date(), attempts: { increment: 1 } }
      });
      try {
        if (!handler) throw new Error(`No handler for queue ${job.queue}`);
        await handler(job.payload as Record<string, unknown>);
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED', lastError: null }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const attempts = job.attempts + 1;
        const dead = attempts >= job.maxAttempts;
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: dead ? 'DEAD' : 'FAILED',
            lastError: message,
            runAt: new Date(Date.now() + Math.min(15 * 60_000, 2 ** attempts * 1000))
          }
        });
        logger.error('job_failed', { queue: job.queue, id: job.id, message, dead });
        if (dead) {
          await sendOperationalAlert('dead_job', `Job ${job.queue} exhausted retries`, {
            jobId: job.id,
            message
          }).catch(() => undefined);
        }
      }
    }
    return due.length;
  });
}

export function startJobWorker() {
  if (workerStarted) return;
  workerStarted = true;
  const timer = setInterval(() => {
    processDueJobs().catch((error) => logger.error('job_worker_tick_failed', { error: String(error) }));
  }, 5000);
  return () => {
    clearInterval(timer);
    workerStarted = false;
  };
}

export async function jobStats() {
  const [pending, failed, dead, succeeded] = await Promise.all([
    prisma.backgroundJob.count({ where: { status: 'PENDING' } }),
    prisma.backgroundJob.count({ where: { status: 'FAILED' } }),
    prisma.backgroundJob.count({ where: { status: 'DEAD' } }),
    prisma.backgroundJob.count({ where: { status: 'SUCCEEDED' } })
  ]);
  return { pending, failed, dead, succeeded };
}
