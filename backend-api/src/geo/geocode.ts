import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

export type GeoPoint = { lat: number; lng: number };

const JOHANNESBURG = { lat: -26.2041, lng: 28.0473 };
const SANDTON_BIAS = { lat: -26.1076, lng: 28.0567 };

export function assertValidCoordinates(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new HttpError(400, 'Invalid coordinates');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpError(400, 'Coordinates out of bounds');
  }
}

async function googleJson<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(502, 'Google Maps API unavailable');
  const body = (await response.json()) as T & { status?: string; error_message?: string };
  const status = body.status || 'OK';
  if (['REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'INVALID_REQUEST', 'UNKNOWN_ERROR'].includes(status)) {
    throw new HttpError(502, body.error_message || `Google Maps error: ${status}`);
  }
  return body;
}

async function placeDetails(placeId: string): Promise<GeoPoint | null> {
  if (!env.GOOGLE_MAPS_API_KEY || !placeId) return null;
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'geometry,formatted_address');
  url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
  url.searchParams.set('region', 'za');
  const body = await googleJson<{
    result?: { geometry?: { location?: { lat: number; lng: number } } };
  }>(url);
  const location = body.result?.geometry?.location;
  return location ? { lat: location.lat, lng: location.lng } : null;
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
    url.searchParams.set('components', 'country:ZA');
    const body = await googleJson<{
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    }>(url);
    const location = body.results?.[0]?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  }

  return null;
}

export async function autocompleteAddress(query: string) {
  const label = query.trim();
  if (label.length < 3) return [];
  if (env.GEOCODER_PROVIDER === 'mapbox' && env.MAPBOX_ACCESS_TOKEN) {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(label)}.json`
    );
    url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN);
    url.searchParams.set('limit', '5');
    url.searchParams.set('country', 'za');
    url.searchParams.set('autocomplete', 'true');
    const response = await fetch(url);
    if (!response.ok) throw new HttpError(502, 'Address provider unavailable');
    const body = (await response.json()) as {
      features?: Array<{ id?: string; place_name?: string; center?: [number, number] }>;
    };
    return (body.features || []).flatMap((feature) =>
      feature.place_name && feature.center
        ? [{ id: feature.id || feature.place_name, label: feature.place_name, lat: feature.center[1], lng: feature.center[0] }]
        : []
    );
  }
  if (env.GEOCODER_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', label);
    url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
    url.searchParams.set('components', 'country:za');
    url.searchParams.set('language', 'en');
    url.searchParams.set('location', `${SANDTON_BIAS.lat},${SANDTON_BIAS.lng}`);
    url.searchParams.set('radius', '40000');
    const body = await googleJson<{
      predictions?: Array<{ place_id?: string; description?: string }>;
    }>(url);
    const predictions = body.predictions || [];
    return Promise.all(
      predictions.slice(0, 5).map(async (prediction) => {
        const point = prediction.place_id
          ? await placeDetails(prediction.place_id)
          : prediction.description
            ? await geocodeWithProvider(prediction.description)
            : null;
        return {
          id: prediction.place_id || prediction.description || '',
          label: prediction.description || '',
          lat: point?.lat ?? null,
          lng: point?.lng ?? null
        };
      })
    );
  }
  if (env.isProduction) throw new HttpError(503, 'Address autocomplete is not configured');
  return [];
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
