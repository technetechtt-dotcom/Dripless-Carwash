/** Slugs excluded from v1 launch — kept in DB but not customer-bookable. */
export const LAUNCH_EXCLUDED_SERVICE_SLUGS = new Set(['taxi', 'delivery']);

export type CatalogServiceRecord = {
  slug: string;
  name: string;
  description?: string | null;
  options?: Array<{ slug: string; name: string; active?: boolean }>;
};

export function isLaunchVisibleService(slug: string) {
  return !LAUNCH_EXCLUDED_SERVICE_SLUGS.has(slug);
}

export function filterLaunchCatalog<T extends { slug: string }>(services: T[]) {
  return services.filter((service) => isLaunchVisibleService(service.slug));
}

export const QUICK_SERVICE_PRESENTATION: Record<
  string,
  { title: string; description: string; gradient: string; icon: 'wash' | 'solar' | 'home' | 'sparkles' }
> = {
  'car-wash': {
    title: 'Dripless Wash',
    description: 'Waterless & eco',
    gradient: 'bg-gradient-to-br from-eco-400 to-eco-600',
    icon: 'sparkles'
  },
  'window-solar-clean': {
    title: 'Solar Clean',
    description: '+15% efficiency',
    gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
    icon: 'solar'
  },
  'home-service': {
    title: 'Home Service',
    description: 'Mattress, couch & carpet',
    gradient: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    icon: 'home'
  }
};

export function bookingRouteForServiceSlug(slug: string) {
  if (slug === 'home-service') return '/booking/mattress-cleaning';
  return `/booking/${slug}`;
}
