import { EventEmitter } from 'node:events';
import type { Response } from 'express';

export type PlatformEvent = {
  id: string;
  type: string;
  at: string;
  payload: Record<string, unknown>;
};

const bus = new EventEmitter();
bus.setMaxListeners(200);

const recent: PlatformEvent[] = [];
const MAX_RECENT = 500;
let seq = 0;

export function publishEvent(type: string, payload: Record<string, unknown>): PlatformEvent {
  seq += 1;
  const event: PlatformEvent = {
    id: `${Date.now()}-${seq}`,
    type,
    at: new Date().toISOString(),
    payload
  };
  recent.push(event);
  if (recent.length > MAX_RECENT) recent.shift();
  bus.emit('event', event);
  return event;
}

export function eventsSince(lastId?: string): PlatformEvent[] {
  if (!lastId) return recent.slice(-50);
  const idx = recent.findIndex((e) => e.id === lastId);
  if (idx < 0) return recent.slice(-50);
  return recent.slice(idx + 1);
}

export function subscribeSse(res: Response, lastEventId?: string) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const replay = eventsSince(lastEventId);
  for (const event of replay) {
    res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  const onEvent = (event: PlatformEvent) => {
    res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  };
  bus.on('event', onEvent);
  const ping = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  }, 15000);

  res.on('close', () => {
    clearInterval(ping);
    bus.off('event', onEvent);
  });
}
