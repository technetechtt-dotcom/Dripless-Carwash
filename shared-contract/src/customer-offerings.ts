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
    description: 'Deep clean and sanitization for healthier sleep.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'couch-cleaning',
    title: 'Couch Cleaning',
    description: 'Revive and refresh upholstery fabrics.',
    category: 'HOME_SERVICE',
    serviceType: 'HOME_SERVICE'
  },
  {
    id: 'carpet-cleaning',
    title: 'Carpet Cleaning',
    description: 'Deep clean plus stain and odor removal.',
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
    id: 'office-cleaning',
    title: 'Office Window Clean',
    description: 'Commercial window service for office buildings.',
    category: 'COMMERCIAL',
    serviceType: 'HOME_SERVICE'
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
  },
  {
    id: 'taxi',
    title: 'Eco Taxi',
    description: 'Low-emission transport jobs for passengers.',
    category: 'MOBILITY_DELIVERY',
    serviceType: 'RIDE'
  },
  {
    id: 'delivery',
    title: 'Parcel Delivery',
    description: 'Flexible parcel delivery job requests.',
    category: 'MOBILITY_DELIVERY',
    serviceType: 'PARCEL'
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
    description: 'Customers can request wash, home, ride, and parcel services.'
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
