import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { Job } from '../types';
import {
  buildNavigationUrl,
  estimateDistanceKm,
  estimateEtaMinutes,
  interpolateGeoPoint,
  textToGeoPoint
} from '@shared/maps';
interface MapViewProps {
  activeJob: Job | null;
  isOnline: boolean;
}
export function MapView({ activeJob, isOnline }: MapViewProps) {
  const hasActiveJob = Boolean(activeJob);
  const pickupLabel = activeJob?.pickupLocation || 'Current area';
  const destinationLabel = activeJob?.dropoffLocation || pickupLabel;

  const pickupPoint = useMemo(
    () => activeJob?.pickupCoordinates ?? textToGeoPoint(pickupLabel, 41),
    [activeJob?.pickupCoordinates, pickupLabel]
  );
  const destinationPoint = useMemo(
    () =>
      activeJob?.destinationCoordinates ??
      textToGeoPoint(destinationLabel, 43),
    [activeJob?.destinationCoordinates, destinationLabel]
  );

  const progress = useMemo(() => {
    switch (activeJob?.status) {
      case 'EN_ROUTE':
        return 0.32;
      case 'ARRIVED':
        return 0.58;
      case 'IN_PROGRESS':
        return 0.78;
      case 'COMPLETED':
        return 1;
      default:
        return 0.18;
    }
  }, [activeJob?.status]);

  const driverPoint = useMemo(
    () => interpolateGeoPoint(pickupPoint, destinationPoint, progress),
    [pickupPoint, destinationPoint, progress]
  );
  const routePoints: LatLngExpression[] = useMemo(
    () => [
      [pickupPoint.lat, pickupPoint.lng],
      [destinationPoint.lat, destinationPoint.lng]
    ],
    [pickupPoint, destinationPoint]
  );
  const bounds: LatLngBoundsExpression = useMemo(
    () => [
      [Math.min(pickupPoint.lat, destinationPoint.lat) - 0.01, Math.min(pickupPoint.lng, destinationPoint.lng) - 0.01],
      [Math.max(pickupPoint.lat, destinationPoint.lat) + 0.01, Math.max(pickupPoint.lng, destinationPoint.lng) + 0.01]
    ],
    [pickupPoint, destinationPoint]
  );
  const remainingKm = estimateDistanceKm(driverPoint, destinationPoint);
  const etaMinutes = estimateEtaMinutes(remainingKm);

  return (
    <div
      className="relative h-80 bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-inner w-full"
      role="img"
      aria-label="Map view showing driver location and route">
      {hasActiveJob ? (
        <>
          <div className="absolute inset-0">
            <MapContainer
              bounds={bounds}
              scrollWheelZoom={false}
              className="h-full w-full"
              aria-label="Driver navigation map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={routePoints} pathOptions={{ color: '#10b981', weight: 5, dashArray: '8 6' }} />
              <CircleMarker center={[pickupPoint.lat, pickupPoint.lng]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>Pickup</Tooltip>
              </CircleMarker>
              {activeJob?.dropoffLocation ? (
                <CircleMarker
                  center={[destinationPoint.lat, destinationPoint.lng]}
                  radius={8}
                  pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
                  <Tooltip direction="top" offset={[0, -8]}>Dropoff</Tooltip>
                </CircleMarker>
              ) : null}
              <CircleMarker center={[driverPoint.lat, driverPoint.lng]} radius={9} pathOptions={{ color: '#065f46', fillColor: '#10b981', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>Your live position</Tooltip>
              </CircleMarker>
            </MapContainer>
          </div>
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white text-[11px] font-medium px-3 py-1.5 rounded-2xl shadow-lg border border-white/20">
            ETA {etaMinutes} min
          </div>
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white text-xs font-medium px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 border border-white/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            Live • {remainingKm.toFixed(1)} km remaining
          </div>
          <a
            href={buildNavigationUrl(driverPoint, destinationPoint)}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 btn-primary text-[11px] px-3 py-2">
            Open navigation
          </a>
          {!activeJob?.dropoffLocation ? (
            <div className="absolute top-4 left-4 bg-amber-100/90 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-medium px-3 py-1.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/80">
              Waiting for destination assignment
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(at_center,#1e2937_0%,#0f172a_70%)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
            <div className="text-6xl mb-4 opacity-80">🗺️</div>
            <p className="text-lg font-medium">
              {isOnline ? 'Looking for jobs nearby...' : 'Go online to see map'}
            </p>
          </div>
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white text-xs font-medium px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 border border-white/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            Live • 2.4 km radius
          </div>
        </>
      )}
      <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-white/10" />
      {hasActiveJob ? <div className="sr-only">Active route from {pickupLabel} to {destinationLabel}</div> : null}
    </div>);

}