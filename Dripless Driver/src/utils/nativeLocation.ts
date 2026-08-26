import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus, type Position } from '@capacitor/geolocation';
import { BackgroundLocation } from '../plugins/backgroundLocation';
import { normaliseGpsSample, type GpsSample } from './gps';

export type LocationWatchHandle = {
  stop: () => void;
};

function toBrowserLikePosition(position: Position): Pick<GeolocationPosition, 'coords' | 'timestamp'> {
  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 999,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    } as GeolocationCoordinates,
    timestamp: position.timestamp
  };
}

async function ensureLocationPermission(): Promise<PermissionStatus> {
  const current = await Geolocation.checkPermissions();
  if (current.location === 'granted' || current.coarseLocation === 'granted') {
    return current;
  }
  return Geolocation.requestPermissions();
}

/**
 * Prefer Capacitor Geolocation on native Android/iOS.
 * On Android, also starts a location foreground service so tracking continues
 * while the app is backgrounded or the screen is locked.
 */
export async function startDriverLocationWatch(input: {
  onSample: (sample: GpsSample) => void;
  onError: (message: string) => void;
}): Promise<LocationWatchHandle> {
  if (Capacitor.isNativePlatform()) {
    const cleanups: Array<() => void> = [];
    try {
      const permissions = await ensureLocationPermission();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        input.onError('Location permission was denied');
        return { stop: () => undefined };
      }

      if (Capacitor.getPlatform() === 'android') {
        try {
          await BackgroundLocation.start({
            title: 'Dripless Driver online',
            body: 'Sharing live location while you are on shift',
            intervalMs: 5_000
          });
          const handle = await BackgroundLocation.addListener('location', (raw) => {
            try {
              input.onSample(
                normaliseGpsSample({
                  coords: {
                    latitude: raw.lat,
                    longitude: raw.lng,
                    accuracy: raw.accuracyM ?? 999,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: raw.heading ?? null,
                    speed: raw.speed ?? null
                  } as GeolocationCoordinates,
                  timestamp: raw.timestamp ?? Date.now()
                })
              );
            } catch (cause) {
              input.onError(cause instanceof Error ? cause.message : 'GPS sample was rejected');
            }
          });
          cleanups.push(() => {
            void handle.remove();
            void BackgroundLocation.stop();
          });
        } catch {
          // Fall through to Capacitor watch if the FG service cannot start.
        }
      }

      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 5_000
        },
        (position, err) => {
          if (err || !position) {
            // Transient GPS blips should not immediately force offline when FG service is running.
            if (cleanups.length === 0) {
              input.onError(err?.message || 'GPS permission or signal was lost');
            }
            return;
          }
          try {
            input.onSample(normaliseGpsSample(toBrowserLikePosition(position)));
          } catch (cause) {
            input.onError(cause instanceof Error ? cause.message : 'GPS sample was rejected');
          }
        }
      );
      cleanups.push(() => {
        void Geolocation.clearWatch({ id: watchId });
      });

      return {
        stop: () => {
          while (cleanups.length) {
            const fn = cleanups.pop();
            try {
              fn?.();
            } catch {
              /* ignore */
            }
          }
        }
      };
    } catch (cause) {
      input.onError(cause instanceof Error ? cause.message : 'Native GPS failed to start');
      return { stop: () => undefined };
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    input.onError('GPS is not available on this device');
    return { stop: () => undefined };
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      try {
        input.onSample(normaliseGpsSample(position));
      } catch (cause) {
        input.onError(cause instanceof Error ? cause.message : 'GPS sample was rejected');
      }
    },
    () => {
      input.onError('GPS permission or signal was lost');
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );

  return {
    stop: () => {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
