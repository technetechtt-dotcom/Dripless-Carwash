type GoogleNamespace = {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: Record<string, unknown>
    ) => {
      fitBounds: (bounds: unknown, padding?: number) => void;
      setCenter: (point: { lat: number; lng: number }) => void;
      setZoom: (zoom: number) => void;
      addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => { remove: () => void };
    };
    Marker: new (opts: Record<string, unknown>) => { setMap: (map: unknown) => void };
    Polyline: new (opts: Record<string, unknown>) => { setMap: (map: unknown) => void };
    LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void };
    SymbolPath: { CIRCLE: unknown };
  };
};

type GoogleMapsWindow = Window & {
  google?: GoogleNamespace;
  __driplessGoogleMapsPromise?: Promise<GoogleNamespace>;
};

export function getBrowserGoogleMapsApiKey(): string {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    return String(env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  } catch {
    return '';
  }
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getBrowserGoogleMapsApiKey());
}

/** Load Google Maps JS API once (Maps + Places libraries). */
export function loadGoogleMaps(apiKey = getBrowserGoogleMapsApiKey()): Promise<GoogleNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
  }

  const win = window as GoogleMapsWindow;
  if (win.google?.maps) return Promise.resolve(win.google);
  if (win.__driplessGoogleMapsPromise) return win.__driplessGoogleMapsPromise;

  win.__driplessGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-dripless-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (win.google?.maps) resolve(win.google);
        else reject(new Error('Google Maps failed to initialise'));
      });
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.dataset.driplessGoogleMaps = 'true';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.onload = () => {
      if (win.google?.maps) resolve(win.google);
      else reject(new Error('Google Maps failed to initialise'));
    };
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(script);
  });

  return win.__driplessGoogleMapsPromise;
}

export type { GoogleNamespace };
