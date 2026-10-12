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
    description: 'Mattress, upholstery & carpet',
    gradient: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    icon: 'home'
  },
  'mattress-cleaning': {
    title: 'Mattress Cleaning',
    description: 'From R300',
    gradient: 'bg-gradient-to-br from-sky-400 to-blue-600',
    icon: 'home'
  },
  'upholstery-cleaning': {
    title: 'Upholstery Cleaning',
    description: 'From R200 / seater',
    gradient: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    icon: 'home'
  },
  'spring-deep-clean': {
    title: 'Spring Deep Clean',
    description: 'From R550',
    gradient: 'bg-gradient-to-br from-amber-400 to-orange-600',
    icon: 'home'
  },
  'carpet-cleaning': {
    title: 'Carpet Cleaning',
    description: 'From R150',
    gradient: 'bg-gradient-to-br from-violet-400 to-purple-600',
    icon: 'home'
  },
  'corporate-office-cleaning': {
    title: 'Corporate Office',
    description: 'From R950',
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-700',
    icon: 'home'
  },
  'office-deep-clean': {
    title: 'Office Deep Clean',
    description: 'Walls to couches',
    gradient: 'bg-gradient-to-br from-cyan-500 to-slate-700',
    icon: 'home'
  },
  'relocation-transport': {
    title: 'Relocation Transport',
    description: 'Home & office moves',
    gradient: 'bg-gradient-to-br from-orange-400 to-rose-600',
    icon: 'home'
  }
};

export function bookingRouteForServiceSlug(slug: string) {
  if (slug === 'home-service') return '/booking/mattress-cleaning';
  if (slug === 'couch-cleaning') return '/booking/upholstery-cleaning';
  return `/booking/${slug}`;
}
