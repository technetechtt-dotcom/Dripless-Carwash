export const CUSTOMER_ROUTES = {
  SPLASH: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  HOME: '/home',
  SERVICES: '/services',
  BOOK_RIDE: '/book-ride',
  BOOKING: (service: string) => `/booking/${service}`,
  BOOKING_CONFIRMATION: '/booking-confirmation',
  RIDE_DETAILS: '/ride-details',
  DELIVERY_DETAILS: '/delivery-details',
  TRACKING: '/tracking',
  SERVICE_HISTORY: '/service-history',
  SERVICE_DETAILS: '/service-details',
  PROFILE: '/profile',
  REWARDS: '/rewards',
  WALLET: '/wallet-management',
  PERSONAL_INFORMATION: '/personal-information',
  PAYMENT_METHODS: '/payment-methods',
  MY_CARS: '/my-cars',
  NOTIFICATIONS: '/notifications',
  VOUCHERS: '/vouchers',
  REFERRALS: '/referrals',
  FEEDBACK: '/feedback',
  HELP_SUPPORT: '/help-support',
  HELP_CENTER: '/help-center',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_CONDITIONS: '/terms-conditions'
} as const;

export const DRIVER_TABS = {
  HOME: 'home',
  JOBS: 'jobs',
  IMPACT: 'impact',
  EARNINGS: 'earnings',
  PROFILE: 'profile'
} as const;

export type DriverTab = (typeof DRIVER_TABS)[keyof typeof DRIVER_TABS];

export const DRIVER_PROFILE_VIEWS = {
  MAIN: 'main',
  DETAILS: 'details',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings'
} as const;

export type DriverProfileView =
  (typeof DRIVER_PROFILE_VIEWS)[keyof typeof DRIVER_PROFILE_VIEWS];

export const OPS_ADMIN_ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  DASHBOARD_PAGE: (page: string) => `/dashboard/${page}`,
  CUSTOMERS: '/customers',
  DRIVERS: '/drivers',
  BOOKINGS: '/bookings',
  NOTIFICATIONS: '/notifications'
} as const;
