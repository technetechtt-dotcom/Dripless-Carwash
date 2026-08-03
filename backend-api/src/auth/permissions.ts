export const DEFAULT_OPS_PERMISSIONS = [
  'customers:read',
  'customers:update',
  'drivers:read',
  'drivers:update',
  'drivers:verify',
  'bookings:read',
  'bookings:update',
  'bookings:assign',
  'notifications:broadcast',
  'activity:read',
  'incidents:read',
  'incidents:manage',
  'specials:manage'
] as const;
