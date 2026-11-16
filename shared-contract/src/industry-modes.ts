import type { CustomerServiceCategory } from './customer-offerings';

/** Platform industries — switch like Uber ↔ Uber Eats. */
export type IndustryMode = 'cleaning' | 'ehailing';

export const INDUSTRY_MODE_STORAGE_KEY = 'dripless_industry_mode';

export const INDUSTRY_MODES: Record<
  IndustryMode,
  {
    id: IndustryMode;
    label: string;
    shortLabel: string;
    tagline: string;
    categories: CustomerServiceCategory[];
    serviceSlugs: string[];
    quickActionSlugs: string[];
  }
> = {
  cleaning: {
    id: 'cleaning',
    label: 'Cleaning',
    shortLabel: 'Clean',
    tagline: 'Car wash, home & commercial cleaning',
    categories: ['DRIPLESS_CARWASH', 'HOME_SERVICE', 'COMMERCIAL', 'SPECIALIZED'],
    serviceSlugs: [
      'car-wash',
      'window-solar-clean',
      'mattress-cleaning',
      'upholstery-cleaning',
      'spring-deep-clean',
      'carpet-cleaning',
      'fleet-wash',
      'corporate-office-cleaning',
      'office-deep-clean',
      'ceramic-coating',
      'engine-detail',
      'headlight-restore',
      'home-service'
    ],
    quickActionSlugs: [
      'car-wash',
      'window-solar-clean',
      'mattress-cleaning',
      'upholstery-cleaning',
      'carpet-cleaning',
      'corporate-office-cleaning',
      'office-deep-clean',
      'spring-deep-clean'
    ]
  },
  ehailing: {
    id: 'ehailing',
    label: 'E-hailing',
    shortLabel: 'Ride',
    tagline: 'Rides for people, deliveries for goods',
    categories: ['MOBILITY_DELIVERY'],
    serviceSlugs: ['taxi', 'delivery', 'relocation-transport'],
    quickActionSlugs: ['taxi', 'delivery', 'relocation-transport']
  }
};

export function isIndustryMode(value: unknown): value is IndustryMode {
  return value === 'cleaning' || value === 'ehailing';
}

export function industryModeForServiceSlug(slug: string): IndustryMode {
  if (INDUSTRY_MODES.ehailing.serviceSlugs.includes(slug)) return 'ehailing';
  return 'cleaning';
}

export function filterSlugsForIndustry<T extends { slug: string }>(
  items: T[],
  mode: IndustryMode
): T[] {
  const allowed = new Set(INDUSTRY_MODES[mode].serviceSlugs);
  return items.filter((item) => allowed.has(item.slug));
}

export function isServiceInIndustry(slug: string, mode: IndustryMode): boolean {
  return INDUSTRY_MODES[mode].serviceSlugs.includes(slug);
}
