import { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { BookingContract } from '@shared/types';

type DriverLocationRow = {
  driverId: string;
  driverName: string;
  activeBookingId?: string | null;
  status: string;
  location: {
    lat: number;
    lng: number;
    heading?: number | null;
    speedKph?: number | null;
    updatedAt: string;
  } | null | undefined;
};

type DispatchMapPanelProps = {
  driverLocations: DriverLocationRow[];
  bookings: BookingContract[];
};

export const DispatchMapPanel = ({ driverLocations, bookings }: DispatchMapPanelProps) => {
  const activeRoutes = useMemo(() => {
    return bookings
      .filter((booking) =>
        ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status)
      )
      .filter(
        (booking) =>
          booking.pickupCoordinates &&
          (booking.destinationCoordinates || booking.pickupCoordinates)
      )
      .slice(0, 8);
  }, [bookings]);

  const mappedDrivers = useMemo(
    () => driverLocations.filter((row) => row.location).slice(0, 40),
    [driverLocations]
  );

  const bounds: LatLngBoundsExpression = useMemo(() => {
    const points: Array<[number, number]> = [];
    for (const row of mappedDrivers) {
      if (row.location) {
        points.push([row.location.lat, row.location.lng]);
      }
    }
    for (const booking of activeRoutes) {
      if (booking.pickupCoordinates) {
        points.push([booking.pickupCoordinates.lat, booking.pickupCoordinates.lng]);
      }
      if (booking.destinationCoordinates) {
        points.push([booking.destinationCoordinates.lat, booking.destinationCoordinates.lng]);
      }
    }
    if (points.length === 0) {
      return [
        [-26.34, 27.88],
        [-26.08, 28.28]
      ];
    }
    const lats = points.map((point) => point[0]);
    const lngs = points.map((point) => point[1]);
    return [
      [Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02],
      [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02]
    ];
  }, [activeRoutes, mappedDrivers]);

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Live fleet map</h3>
      <p className="muted" style={{ margin: 0 }}>
        Driver positions and active pickup/dropoff routes.
      </p>
      <div style={{ height: 320, borderRadius: 12, overflow: 'hidden' }}>
        <MapContainer bounds={bounds} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {activeRoutes.map((booking) => {
            const pickup = booking.pickupCoordinates;
            const destination = booking.destinationCoordinates ?? booking.pickupCoordinates;
            if (!pickup || !destination) return null;
            const polyline: LatLngExpression[] = [
              [pickup.lat, pickup.lng],
              [destination.lat, destination.lng]
            ];
            return (
              <Polyline
                key={`route-${booking.id}`}
                positions={polyline}
                pathOptions={{ color: '#10b981', weight: 4, dashArray: '7 6' }}
              />
            );
          })}

          {activeRoutes.map((booking) => {
            if (!booking.pickupCoordinates) return null;
            return (
              <CircleMarker
                key={`pickup-${booking.id}`}
                center={[booking.pickupCoordinates.lat, booking.pickupCoordinates.lng]}
                radius={6}
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  {`Pickup ${booking.id}`}
                </Tooltip>
              </CircleMarker>
            );
          })}

          {activeRoutes.map((booking) => {
            if (!booking.destinationCoordinates) return null;
            return (
              <CircleMarker
                key={`dropoff-${booking.id}`}
                center={[booking.destinationCoordinates.lat, booking.destinationCoordinates.lng]}
                radius={6}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  {`Dropoff ${booking.id}`}
                </Tooltip>
              </CircleMarker>
            );
          })}

          {mappedDrivers.map((driver) => {
            if (!driver.location) return null;
            return (
              <CircleMarker
                key={driver.driverId}
                center={[driver.location.lat, driver.location.lng]}
                radius={7}
                pathOptions={{ color: '#065f46', fillColor: '#10b981', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>
                  {`${driver.driverName} (${driver.status})`}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
