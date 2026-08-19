import { EventEmitter } from 'node:events';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { logger } from './logger.js';

export type PlatformEvent = {
  id: string;
  type: string;
  at: string;
  payload: Record<string, unknown>;
};

const bus = new EventEmitter();
bus.setMaxListeners(500);

function mapEvent(row: {
  sequence: bigint;
  type: string;
  payload: unknown;
  createdAt: Date;
}): PlatformEvent {
  return {
    id: row.sequence.toString(),
    type: row.type,
    at: row.createdAt.toISOString(),
    payload: row.payload as Record<string, unknown>
  };
}

export function publishEvent(type: string, payload: Record<string, unknown>) {
  void prisma.realtimeEvent
    .create({ data: { type, payload: payload as Prisma.InputJsonValue } })
    .then((row) => bus.emit('event', mapEvent(row)))
    .catch((error) => logger.error('realtime_event_persist_failed', { type, error: String(error) }));
}

function writeEvent(res: Response, event: PlatformEvent) {
  res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function subscribeSse(res: Response, lastEventId?: string) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let cursor = /^\d+$/.test(lastEventId || '') ? BigInt(lastEventId!) : 0n;
  let closed = false;
  let polling = false;

  const poll = async () => {
    if (closed || polling) return;
    polling = true;
    try {
      const rows = cursor
        ? await prisma.realtimeEvent.findMany({
            where: { sequence: { gt: cursor } },
            orderBy: { sequence: 'asc' },
            take: 100
          })
        : (
            await prisma.realtimeEvent.findMany({ orderBy: { sequence: 'desc' }, take: 50 })
          ).reverse();
      for (const row of rows) {
        if (row.sequence <= cursor) continue;
        cursor = row.sequence;
        writeEvent(res, mapEvent(row));
      }
    } catch (error) {
      logger.error('realtime_event_poll_failed', { error: String(error) });
    } finally {
      polling = false;
    }
  };

  const onEvent = (event: PlatformEvent) => {
    const sequence = BigInt(event.id);
    if (sequence <= cursor) return;
    cursor = sequence;
    writeEvent(res, event);
  };
  bus.on('event', onEvent);
  void poll();
  const pollTimer = setInterval(() => void poll(), 2000);
  const pingTimer = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString(), cursor: cursor.toString() })}\n\n`);
  }, 15000);

  res.on('close', () => {
    closed = true;
    clearInterval(pollTimer);
    clearInterval(pingTimer);
    bus.off('event', onEvent);
  });
}
