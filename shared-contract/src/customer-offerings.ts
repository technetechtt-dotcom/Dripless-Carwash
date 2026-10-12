import type { ServiceType } from './types';

export type CustomerServiceCategory =
  | 'DRIPLESS_CARWASH'
  | 'HOME_SERVICE'
  | 'COMMERCIAL'
  | 'SPECIALIZED'
  | 'MOBILITY_DELIVERY';

export interface CustomerServiceOffering {
  id: string;
  title: string;
  description: string;
  category: CustomerServiceCategory;
  serviceType: ServiceType;
}

export interface CustomerFeature {
  id: string;
  title: string;
  description: string;
}

export const customerServiceOfferings: CustomerServiceOffering[] = [
  {
    id: 'car-wash',
    title: 'Dripless Car Wash',
    description: 'Waterless and eco-friendly cleaning.',
    category: 'DRIPLESS_CARWASH',
    serviceType: 'WASH'
  },
  {
    id: 'window-solar-clean',
    title: 'Window and Solar Cleaning',
    description: 'Streak-free service that helps improve panel efficiency.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'mattress-cleaning',
    title: 'Mattress Cleaning',
    description: 'Single, double, and queen/king mattress deep clean.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'upholstery-cleaning',
    title: 'Upholstery Cleaning',
    description: 'Per-seater and L-shape couch cleaning.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'spring-deep-clean',
    title: 'Spring Deep Clean',
    description: 'Bedroom packages, spring clean, and move in/out.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'carpet-cleaning',
    title: 'Carpet Cleaning',
    description: 'Rooms, lounge, and stairs — by size.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'fleet-wash',
    title: 'Fleet Wash',
    description: 'Bulk vehicle cleaning for business fleets.',
    category: 'COMMERCIAL',
    serviceType: 'WASH'
  },
  {
    id: 'corporate-office-cleaning',
    title: 'Corporate Office Cleaning',
    description: 'Scheduled cleaning for small offices through full floors.',
    category: 'COMMERCIAL',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'office-deep-clean',
    title: 'Office Deep Cleaning Solutions',
    description: 'Walls, windows, mats, bathrooms, office, chairs, and couches.',
    category: 'COMMERCIAL',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'relocation-transport',
    title: 'Relocation Transport',
    description: 'Transport of home and office items and furniture for relocation.',
    category: 'MOBILITY_DELIVERY',
    serviceType: 'PARCEL'
  },
  {
    id: 'ceramic-coating',
    title: 'Ceramic Coating',
    description: 'Long-lasting paint protection package.',
    category: 'SPECIALIZED',
    serviceType: 'WASH'
  },
  {
    id: 'engine-detail',
    title: 'Engine Bay Detail',
    description: 'Professional engine compartment detailing.',
    category: 'SPECIALIZED',
    serviceType: 'WASH'
  },
  {
    id: 'headlight-restore',
    title: 'Headlight Restoration',
    description: 'Restore lens clarity and brightness.',
    category: 'SPECIALIZED',
    serviceType: 'WASH'
  }
];

export const customerFeatureSet: CustomerFeature[] = [
  {
    id: 'dripless-hub',
    title: 'Dripless Hub',
    description: 'Central space for bookings, reports, and reminders.'
  },
  {
    id: 'multi-service-booking',
    title: 'Multi-service Booking',
    description: 'Customers can request wash and home cleaning services.'
  },
  {
    id: 'real-time-tracking',
    title: 'Real-time Tracking',
    description: 'Trip and task tracking with status updates and notifications.'
  }
];

export const customerServiceCategoryLabels: Record<CustomerServiceCategory, string> = {
  DRIPLESS_CARWASH: 'Dripless Carwash',
  HOME_SERVICE: 'Home Services',
  COMMERCIAL: 'Commercial Services',
  SPECIALIZED: 'Specialized Services',
  MOBILITY_DELIVERY: 'Mobility and Delivery'
};
