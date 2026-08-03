import { CUSTOMER_ROUTES } from '@shared/routes';

/**
 * Typed named routes — use these instead of magic strings.
 * e.g. navigate(ROUTES.HOME) instead of navigate('/home')
 */
export const ROUTES = {
  ...CUSTOMER_ROUTES,
  BOOK_SERVICE: CUSTOMER_ROUTES.BOOKING,
  RATE_SERVICE: '/rate-service',
  DRIPLESS_FEATURES: '/dripless-features'
} as const;