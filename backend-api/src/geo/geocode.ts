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

async function geocodeWithProvider(label: string): Promise<GeoPoint | null> {
  if (env.GEOCODER_PROVIDER === 'mapbox' && env.MAPBOX_ACCESS_TOKEN) {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(label)}.json`
    );
    url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN);
    url.searchParams.set('limit', '1');
    url.searchParams.set('country', 'za');
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };
    const center = body.features?.[0]?.center;
    if (!center) return null;
    return { lng: center[0], lat: center[1] };
  }

  if (env.GEOCODER_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', label);
    url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
    url.searchParams.set('region', 'za');
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const location = body.results?.[0]?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  }

  return null;
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
  const latOffset = (hash[0] / 255) * 0.2 - 0.1;
  const lngOffset = (hash[1] / 255) * 0.2 - 0.1;
  return {
    lat: JOHANNESBURG.lat + latOffset,
    lng: JOHANNESBURG.lng + lngOffset
  };
}

export async function resolveCoordinatesAsync(input: {
  lat?: number | null;
  lng?: number | null;
  label?: string | null;
}): Promise<GeoPoint | null> {
  const direct = resolveCoordinates(input);
  if (direct && input.lat != null && input.lng != null) return direct;

  if (input.label?.trim()) {
    try {
      const fromProvider = await geocodeWithProvider(input.label.trim());
      if (fromProvider) {
        assertValidCoordinates(fromProvider.lat, fromProvider.lng);
        return fromProvider;
      }
    } catch {
      // fall through
    }
  }

  if (env.isProduction && env.GEOCODER_PROVIDER !== 'none') {
    throw new HttpError(
      503,
      'Geocoding provider unavailable. Provide coordinates or configure API keys.'
    );
  }

  return resolveCoordinates(input);
}
