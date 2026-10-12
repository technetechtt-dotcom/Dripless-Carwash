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

/** Preferred Home quick-action order (first four that exist in catalog). */
export const HOME_QUICK_ACTION_SLUGS = [
  'car-wash',
  'window-solar-clean',
  'mattress-cleaning',
  'relocation-transport',
  'upholstery-cleaning',
  'carpet-cleaning',
  'corporate-office-cleaning',
  'office-deep-clean',
  'spring-deep-clean'
] as const;

export function bookingRouteForServiceSlug(slug: string) {
  if (slug === 'home-service') return '/booking/mattress-cleaning';
  if (slug === 'couch-cleaning') return '/booking/upholstery-cleaning';
  if (slug === 'fleet-wash') return '/booking/car-wash';
  if (slug === 'ceramic-coating' || slug === 'engine-detail' || slug === 'headlight-restore') {
    return '/booking/car-wash';
  }
  return `/booking/${slug}`;
}

/** Map a booking service display name (or slug) to a bookable route slug. */
export function bookingSlugFromServiceName(service: string): string {
  const value = service.trim().toLowerCase();
  if (!value) return 'car-wash';

  const slugCandidates = [
    'relocation-transport',
    'corporate-office-cleaning',
    'office-deep-clean',
    'window-solar-clean',
    'mattress-cleaning',
    'upholstery-cleaning',
    'spring-deep-clean',
    'carpet-cleaning',
    'car-wash',
    'home-service',
    'fleet-wash',
    'couch-cleaning'
  ];
  for (const slug of slugCandidates) {
    if (value === slug || value.includes(slug.replace(/-/g, ' ')) || value.includes(slug)) {
      if (slug === 'home-service' || slug === 'couch-cleaning' || slug === 'fleet-wash') {
        return bookingRouteForServiceSlug(slug).replace('/booking/', '');
      }
      return slug;
    }
  }

  if (value.includes('relocation') || value.includes('furniture transport') || value.includes('moving')) {
    return 'relocation-transport';
  }
  if (value.includes('corporate office') || value.includes('office cleaning')) {
    return value.includes('deep') ? 'office-deep-clean' : 'corporate-office-cleaning';
  }
  if (value.includes('office deep')) return 'office-deep-clean';
  if (value.includes('solar') || value.includes('window')) return 'window-solar-clean';
  if (value.includes('mattress')) return 'mattress-cleaning';
  if (value.includes('upholstery') || value.includes('couch')) return 'upholstery-cleaning';
  if (value.includes('spring') || value.includes('move in') || value.includes('move out')) {
    return 'spring-deep-clean';
  }
  if (value.includes('carpet')) return 'carpet-cleaning';
  if (value.includes('fleet') || value.includes('wash') || value.includes('valet') || value.includes('detail')) {
    return 'car-wash';
  }
  // Launch-excluded mobility — send users to services hub via car-wash fallback is wrong;
  // rebook of historic taxi/delivery should land on services list via redirect in booking page.
  if (value.includes('taxi') || value.includes('ride') || value.includes('parcel') || value.includes('delivery')) {
    return 'car-wash';
  }
  return 'car-wash';
}
