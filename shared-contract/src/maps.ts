export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const DEFAULT_ORIGIN: GeoPoint = { lat: -26.2041, lng: 28.0473 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function textToGeoPoint(
  label: string,
  seed = 0,
  origin: GeoPoint = DEFAULT_ORIGIN
): GeoPoint {
  const safeLabel = label.trim().toLowerCase() || 'unknown location';
  const hash = hashString(`${safeLabel}:${seed}`);
  const latOffset = ((hash % 2000) / 100000) * (hash % 2 === 0 ? 1 : -1);
  const lngOffset =
    (((Math.floor(hash / 2000) % 2000) / 100000) * (hash % 3 === 0 ? -1 : 1));
  return {
    lat: clamp(origin.lat + latOffset, -89.9, 89.9),
    lng: clamp(origin.lng + lngOffset, -179.9, 179.9)
  };
}

export function interpolateGeoPoint(
  start: GeoPoint,
  end: GeoPoint,
  progress: number
): GeoPoint {
  const ratio = clamp(progress, 0, 1);
  return {
    lat: start.lat + (end.lat - start.lat) * ratio,
    lng: start.lng + (end.lng - start.lng) * ratio
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function estimateDistanceKm(from: GeoPoint, to: GeoPoint) {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * arc;
}

export function estimateEtaMinutes(distanceKm: number, speedKmPerHour = 32) {
  if (distanceKm <= 0) return 1;
  const hours = distanceKm / Math.max(speedKmPerHour, 5);
  return Math.max(1, Math.round(hours * 60));
}

export function buildNavigationUrl(from: GeoPoint, to: GeoPoint) {
  const origin = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}`;
  const destination = `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
