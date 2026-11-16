import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type AnalyticsPayload = Record<string, unknown>;

const getTracker = () => {
  if (typeof window === 'undefined') return null;
  const tracker = (
    window as unknown as {
      analytics?: {
        track?: (eventName: string, properties?: AnalyticsPayload) => void;
        identify?: (userId: string, traits?: AnalyticsPayload) => void;
        page?: (pageName: string) => void;
      };
      gtag?: (eventName: string, action: string, payload?: AnalyticsPayload) => void;
    }
  );
  return tracker;
};

const analytics = {
  track: (eventName: string, properties?: AnalyticsPayload) => {
    const tracker = getTracker();
    tracker?.analytics?.track?.(eventName, properties);
    tracker?.gtag?.('event', eventName, properties);
  },
  identify: (userId: string, traits?: AnalyticsPayload) => {
    const tracker = getTracker();
    tracker?.analytics?.identify?.(userId, traits);
  },
  page: (pageName: string) => {
    const tracker = getTracker();
    tracker?.analytics?.page?.(pageName);
    tracker?.gtag?.('event', 'page_view', { page_path: pageName });
  }
};

export const useAnalytics = () => {
  const location = useLocation();

  // Track page views automatically
  useEffect(() => {
    analytics.page(location.pathname);
  }, [location.pathname]);

  return {
    trackEvent: analytics.track,
    identifyUser: analytics.identify
  };
};