export type GpsSample = {
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracyM: number;
  recordedAt: string;
};

export function normaliseGpsSample(
  position: Pick<GeolocationPosition, 'coords' | 'timestamp'>,
  nowMs = Date.now()
): GpsSample {
  const { latitude, longitude, accuracy, speed, heading } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('GPS returned invalid coordinates');
  }
  if (!Number.isFinite(position.timestamp) || position.timestamp > nowMs + 60_000) {
    throw new Error('GPS timestamp is invalid');
  }
  if (nowMs - position.timestamp > 30_000) {
    throw new Error('GPS location is stale');
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 200) {
    throw new Error('GPS accuracy is too low');
  }
  return {
    lat: latitude,
    lng: longitude,
    speedKph: typeof speed === 'number' && Number.isFinite(speed) ? speed * 3.6 : null,
    heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
    accuracyM: accuracy,
    recordedAt: new Date(position.timestamp).toISOString()
  };
}

