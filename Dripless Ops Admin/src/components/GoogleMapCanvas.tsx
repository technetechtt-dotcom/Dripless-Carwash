import React, { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@shared/maps';
import { getBrowserGoogleMapsApiKey, loadGoogleMaps, type GoogleNamespace } from '@shared/googleMapsLoader';

export type GoogleMapMarker = {
  id: string;
  position: GeoPoint;
  title?: string;
  color?: string;
};

type GoogleMapCanvasProps = {
  className?: string;
  style?: React.CSSProperties;
  center?: GeoPoint;
  zoom?: number;
  markers?: GoogleMapMarker[];
  path?: GeoPoint[];
  fitMarkers?: boolean;
  onClick?: (point: GeoPoint) => void;
  ariaLabel?: string;
};

const DEFAULT_CENTER: GeoPoint = { lat: -26.2041, lng: 28.0473 };

export default function GoogleMapCanvas({
  className,
  style,
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  path = [],
  fitMarkers = true,
  onClick,
  ariaLabel = 'Map'
}: GoogleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const googleRef = useRef<GoogleNamespace | null>(null);
  const markersRef = useRef<Array<{ setMap: (map: unknown) => void }>>([]);
  const polylineRef = useRef<{ setMap: (map: unknown) => void } | null>(null);
  const clickListenerRef = useRef<{ remove: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = getBrowserGoogleMapsApiKey();
    if (!key || !containerRef.current) {
      setFailed(true);
      return;
    }

    void loadGoogleMaps(key)
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        googleRef.current = g;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // Initialise once; later effects update overlays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const g = googleRef.current;
    if (!ready || !map || !g) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = markers.map((marker) =>
      new g.maps.Marker({
        map,
        position: marker.position,
        title: marker.title,
        icon: marker.color
          ? {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: marker.color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          : undefined
      })
    );

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (path.length >= 2) {
      polylineRef.current = new g.maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: 5
      });
    }

    if (fitMarkers) {
      const bounds = new g.maps.LatLngBounds();
      let hasPoint = false;
      for (const marker of markers) {
        bounds.extend(marker.position);
        hasPoint = true;
      }
      for (const point of path) {
        bounds.extend(point);
        hasPoint = true;
      }
      if (hasPoint) {
        map.fitBounds(bounds, 48);
      } else {
        map.setCenter(center);
        map.setZoom(zoom);
      }
    } else {
      map.setCenter(center);
      map.setZoom(zoom);
    }

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }
    if (onClick) {
      clickListenerRef.current = map.addListener(
        'click',
        (event: { latLng?: { lat: () => number; lng: () => number } }) => {
          if (!event.latLng) return;
          onClick({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        }
      );
    }
  }, [ready, markers, path, fitMarkers, center, zoom, onClick]);

  if (failed) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          background: '#0f172a',
          color: '#94a3b8',
          fontSize: 13,
          ...style
        }}
        role="img"
        aria-label={ariaLabel}>
        Google Maps unavailable
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
