import { describe, expect, it } from 'vitest';
import { normaliseGpsSample } from './gps';

const position = (overrides: Partial<GeolocationCoordinates & { timestamp: number }> = {}) => ({
  timestamp: overrides.timestamp ?? 1_000_000,
  coords: {
    latitude: overrides.latitude ?? -26.1076,
    longitude: overrides.longitude ?? 28.0567,
    accuracy: overrides.accuracy ?? 12,
    altitude: null,
    altitudeAccuracy: null,
    heading: overrides.heading === undefined ? 90 : overrides.heading,
    speed: overrides.speed === undefined ? 10 : overrides.speed,
    toJSON: () => ({})
  }
});

describe('driver GPS sample normalisation', () => {
  it('normalises a fresh accurate browser location', () => {
    const result = normaliseGpsSample(position(), 1_005_000);
    expect(result).toMatchObject({
      lat: -26.1076,
      lng: 28.0567,
      speedKph: 36,
      heading: 90,
      accuracyM: 12
    });
  });

  it('supports missing speed and heading', () => {
    const result = normaliseGpsSample(position({ speed: null, heading: null }), 1_005_000);
    expect(result.speedKph).toBeNull();
    expect(result.heading).toBeNull();
  });

  it('rejects stale, future, inaccurate, and impossible samples', () => {
    expect(() => normaliseGpsSample(position({ timestamp: 900_000 }), 1_005_000)).toThrow('stale');
    expect(() => normaliseGpsSample(position({ timestamp: 1_100_000 }), 1_005_000)).toThrow('timestamp');
    expect(() => normaliseGpsSample(position({ accuracy: 500 }), 1_005_000)).toThrow('accuracy');
    expect(() => normaliseGpsSample(position({ latitude: 91 }), 1_005_000)).toThrow('coordinates');
    expect(() => normaliseGpsSample(position({ longitude: 181 }), 1_005_000)).toThrow('coordinates');
  });
});
