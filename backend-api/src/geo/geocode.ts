import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

export type GeoPoint = { lat: number; lng: number };

const JOHANNESBURG = { lat: -26.2041, lng: 28.0473 };

export function assertValidCoordinates(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new HttpError(400, 'Invalid coordinates');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpError(400, 'Coordinates out of bounds');
  }
}

/** Production: never invent coordinates. Demo mode may synthesize for UI demos. */
export function resolveCoordinates(input: {
  lat?: number | null;
  lng?: number | null;
  label?: string | null;
}): GeoPoint | null {
  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    assertValidCoordinates(input.lat, input.lng);
    return { lat: input.lat, lng: input.lng };
  }

  if (!env.demoMode) {
    return null;
  }

  const label = input.label?.trim() || 'unknown';
  const hash = createHash('sha256').update(label).digest();
  const latOffset = ((hash[0] / 255) * 0.2 - 0.1);
  const lngOffset = ((hash[1] / 255) * 0.2 - 0.1);
  return {
    lat: JOHANNESBURG.lat + latOffset,
    lng: JOHANNESBURG.lng + lngOffset
  };
}
