/** Canonical platform realtime event types (Customer / Driver / Ops). */
export const PLATFORM_EVENT_TYPES = [
  'booking.created',
  'booking.assigned',
  'booking.status',
  'booking.message',
  'booking.payment',
  'payment.status',
  'driver.location',
  'notification.created',
  'ops.incident',
  'ping'
] as const;

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number] | (string & {});

export type PlatformEventEnvelope = {
  /** Monotonic sequence id from RealtimeEvent.sequence */
  id: string;
  type: PlatformEventType;
  at: string;
  /** Schema version for payload consumers */
  version: number;
  payload: Record<string, unknown>;
};

export const PLATFORM_EVENT_VERSION = 1;

export function isBookingLifecycleEvent(type: string): boolean {
  return (
    type === 'booking.created' ||
    type === 'booking.assigned' ||
    type === 'booking.status' ||
    type === 'booking.payment' ||
    type === 'payment.status'
  );
}
