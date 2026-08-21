import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { GeoPoint } from '@shared/maps';
import {
  buildNavigationUrl,
  estimateDistanceKm,
  estimateEtaMinutes,
  interpolateGeoPoint
} from '@shared/maps';
import GoogleMapCanvas from './GoogleMapCanvas';
import { isGoogleMapsConfigured } from '@shared/googleMapsLoader';

interface RouteMapCardProps {
  pickup: GeoPoint;
  destination: GeoPoint;
  pickupLabel: string;
  destinationLabel: string;
  progress?: number;
  showDriverMarker?: boolean;
  driverPoint?: GeoPoint | null;
}

export default function RouteMapCard({
  pickup,
  destination,
  pickupLabel,
  destinationLabel,
  progress = 0.35,
  showDriverMarker = false,
  driverPoint
}: RouteMapCardProps) {
  const useGoogle = isGoogleMapsConfigured();
  const route: LatLngExpression[] = useMemo(
    () => [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng]
    ],
    [pickup, destination]
  );

  const bounds: LatLngBoundsExpression = useMemo(
    () => [
      [Math.min(pickup.lat, destination.lat) - 0.01, Math.min(pickup.lng, destination.lng) - 0.01],
      [Math.max(pickup.lat, destination.lat) + 0.01, Math.max(pickup.lng, destination.lng) + 0.01]
    ],
    [pickup, destination]
  );

  const driver = useMemo(
    () => driverPoint ?? interpolateGeoPoint(pickup, destination, progress),
    [driverPoint, pickup, destination, progress]
  );
  const remainingDistance = estimateDistanceKm(driver, destination);
  const etaMinutes = estimateEtaMinutes(remainingDistance);
  const markers = useMemo(() => {
    const rows = [
      { id: 'pickup', position: pickup, title: `Pickup: ${pickupLabel}`, color: '#3b82f6' },
      { id: 'destination', position: destination, title: `Destination: ${destinationLabel}`, color: '#ef4444' }
    ];
    if (showDriverMarker) {
      rows.push({ id: 'driver', position: driver, title: 'Driver', color: '#10b981' });
    }
    return rows;
  }, [pickup, destination, pickupLabel, destinationLabel, showDriverMarker, driver]);

  return (
    <div className="glass-card p-3 space-y-3 dark:bg-slate-800/90">
      <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-700/70">
        {useGoogle ? (
          <GoogleMapCanvas
            markers={markers}
            path={[pickup, destination]}
            ariaLabel="Route map for live tracking"
          />
        ) : (
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={false}
            className="h-full w-full"
            aria-label="Route map for live tracking">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={route} pathOptions={{ color: '#10b981', weight: 5, dashArray: '8 8' }} />
            <CircleMarker center={[pickup.lat, pickup.lng]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -8]}>{`Pickup: ${pickupLabel}`}</Tooltip>
            </CircleMarker>
            <CircleMarker
              center={[destination.lat, destination.lng]}
              radius={8}
              pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -8]}>{`Destination: ${destinationLabel}`}</Tooltip>
            </CircleMarker>
            {showDriverMarker ? (
              <CircleMarker
                center={[driver.lat, driver.lng]}
                radius={9}
                pathOptions={{ color: '#065f46', fillColor: '#10b981', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>Driver live position</Tooltip>
              </CircleMarker>
            ) : null}
          </MapContainer>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="bg-slate-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200">
          ETA {etaMinutes} min
        </div>
        <div className="bg-slate-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200">
          Remaining {remainingDistance.toFixed(1)} km
        </div>
        <a
          href={buildNavigationUrl(pickup, destination)}
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-3 py-2 text-[11px] font-semibold">
          Open Google Maps
        </a>
      </div>
    </div>
  );
}
