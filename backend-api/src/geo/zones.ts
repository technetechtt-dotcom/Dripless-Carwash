import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';
import type { GeoPoint } from './geocode.js';

type Ring = Array<[number, number]>;

function pointInRing(point: GeoPoint, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: GeoPoint, geojson: unknown): boolean {
  const g = geojson as { type?: string; coordinates?: unknown };
  if (g?.type === 'Polygon') {
    const rings = g.coordinates as Ring[];
    if (!rings?.[0]) return false;
    if (!pointInRing(point, rings[0].map(([lng, lat]) => [lng, lat]) as unknown as Ring)) {
      return false;
    }
    return true;
  }
  if (g?.type === 'MultiPolygon') {
    const polys = g.coordinates as Ring[][];
    return polys.some((poly) => pointInPolygon(point, { type: 'Polygon', coordinates: poly }));
  }
  return false;
}

export async function assertInServiceArea(point: GeoPoint | null, label?: string, scheduledAt = new Date()) {
  const areas = await prisma.serviceArea.findMany({ where: { active: true } });
  if (!areas.length) return null;
  if (!point) throw new HttpError(400, 'Coordinates required for service-area validation');
  const match = areas.find((area) => pointInPolygon(point, area.polygonGeoJson));
  if (!match) {
    throw new HttpError(400, `Address is outside the Dripless service area${label ? `: ${label}` : ''}`);
  }
  if (match.weatherHold) {
    throw new HttpError(503, match.weatherReason || 'Service temporarily suspended due to weather');
  }
  const localTime = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(scheduledAt);
  if (localTime < match.operatingFrom || localTime > match.operatingTo) {
    throw new HttpError(
      400,
      `Service area operates from ${match.operatingFrom} to ${match.operatingTo}`
    );
  }
  return match;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const { env } = await import('../config/env.js');
  if (env.GEOCODER_PROVIDER === 'mapbox' && env.MAPBOX_ACCESS_TOKEN) {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
    );
    url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN);
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as { features?: Array<{ place_name?: string }> };
    return body.features?.[0]?.place_name ?? null;
  }
  if (env.GEOCODER_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as { results?: Array<{ formatted_address?: string }> };
    return body.results?.[0]?.formatted_address ?? null;
  }
  return null;
}

export async function roadRoute(from: GeoPoint, to: GeoPoint) {
  const { env } = await import('../config/env.js');
  if (env.ROUTING_PROVIDER === 'mapbox' && env.MAPBOX_ACCESS_TOKEN) {
    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}`
    );
    url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN);
    url.searchParams.set('overview', 'false');
    const response = await fetch(url);
    if (response.ok) {
      const body = (await response.json()) as {
        routes?: Array<{ distance?: number; duration?: number }>;
      };
      const route = body.routes?.[0];
      if (route?.distance != null) {
        return {
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          etaMinutes: Math.max(1, Math.round((route.duration || 0) / 60))
        };
      }
    }
  }
  if (env.ROUTING_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${from.lat},${from.lng}`);
    url.searchParams.set('destination', `${to.lat},${to.lng}`);
    url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
    url.searchParams.set('region', 'za');
    url.searchParams.set('departure_time', 'now');
    const response = await fetch(url);
    if (response.ok) {
      const body = (await response.json()) as {
        routes?: Array<{ legs?: Array<{ distance?: { value?: number }; duration_in_traffic?: { value?: number }; duration?: { value?: number } }> }>;
      };
      const leg = body.routes?.[0]?.legs?.[0];
      if (leg?.distance?.value != null) {
        return {
          distanceKm: Number((leg.distance.value / 1000).toFixed(2)),
          etaMinutes: Math.max(1, Math.round(Number(leg.duration_in_traffic?.value || leg.duration?.value || 0) / 60))
        };
      }
    }
  }
  if (env.isProduction) {
    throw new HttpError(503, 'Routing provider unavailable');
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.asin(Math.sqrt(h));
  const roadKm = km * 1.35;
  return {
    distanceKm: Number(roadKm.toFixed(2)),
    etaMinutes: Math.max(5, Math.round(roadKm * 2.4))
  };
}
