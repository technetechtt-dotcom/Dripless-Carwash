import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import GoogleMapCanvas from './GoogleMapCanvas';
import { isGoogleMapsConfigured } from '@shared/googleMapsLoader';

type GeoPoint = { lat: number; lng: number };

type LocationPickerMapProps = {
  pickup: GeoPoint | null;
  destination: GeoPoint | null;
  needsDestination: boolean;
  onPickupChange: (point: GeoPoint) => void;
  onDestinationChange: (point: GeoPoint) => void;
};

function ClickCapture({
  needsDestination,
  onPickupChange,
  onDestinationChange
}: {
  needsDestination: boolean;
  onPickupChange: (point: GeoPoint) => void;
  onDestinationChange: (point: GeoPoint) => void;
}) {
  useMapEvents({
    click(event) {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (event.originalEvent.shiftKey || !needsDestination) {
        onPickupChange(point);
        return;
      }
      onDestinationChange(point);
    }
  });
  return null;
}

export default function LocationPickerMap({
  pickup,
  destination,
  needsDestination,
  onPickupChange,
  onDestinationChange
}: LocationPickerMapProps) {
  const useGoogle = isGoogleMapsConfigured();
  const center = pickup || destination || { lat: -26.1076, lng: 28.0567 };
  const markers = useMemo(() => {
    const rows = [];
    if (pickup) rows.push({ id: 'pickup', position: pickup, title: 'Pickup', color: '#3b82f6' });
    if (needsDestination && destination) {
      rows.push({ id: 'destination', position: destination, title: 'Destination', color: '#ef4444' });
    }
    return rows;
  }, [pickup, destination, needsDestination]);

  return (
    <div className="glass-card p-3 space-y-2">
      <div style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
        {useGoogle ? (
          <GoogleMapCanvas
            center={center}
            zoom={13}
            markers={markers}
            fitMarkers={markers.length > 0}
            onClick={(point) => {
              if (!needsDestination) {
                onPickupChange(point);
                return;
              }
              // First tap sets pickup if missing, otherwise destination.
              if (!pickup) onPickupChange(point);
              else onDestinationChange(point);
            }}
            ariaLabel="Service location map"
          />
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickCapture
              needsDestination={needsDestination}
              onPickupChange={onPickupChange}
              onDestinationChange={onDestinationChange}
            />
            {pickup ? (
              <CircleMarker
                center={[pickup.lat, pickup.lng]}
                radius={7}
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  Pickup point
                </Tooltip>
              </CircleMarker>
            ) : null}
            {needsDestination && destination ? (
              <CircleMarker
                center={[destination.lat, destination.lng]}
                radius={7}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  Destination point
                </Tooltip>
              </CircleMarker>
            ) : null}
          </MapContainer>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {needsDestination
          ? useGoogle
            ? 'Tap map to set pickup, then tap again for destination.'
            : 'Tap map to set destination. Hold Shift while tapping to set pickup.'
          : 'Tap map to set your service location.'}
      </p>
    </div>
  );
}
