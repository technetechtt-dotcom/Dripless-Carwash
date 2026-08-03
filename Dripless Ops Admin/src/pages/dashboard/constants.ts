import type {
  AccountStatus,
  BookingStatus,
  DriverVerificationStatus,
  OpsActivityItem
} from '@shared/types';

export const statusOptions: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
];

export const accountStatusOptions: AccountStatus[] = ['ACTIVE', 'PENDING_REVIEW', 'SUSPENDED'];

export const verificationStatusOptions: DriverVerificationStatus[] = [
  'VERIFIED',
  'PENDING',
  'REJECTED',
  'EXPIRED'
];

export const activityTypeOptions: Array<OpsActivityItem['type'] | 'ALL'> = [
  'ALL',
  'CUSTOMER_STATUS_UPDATED',
  'DRIVER_STATUS_UPDATED',
  'DRIVER_VERIFICATION_UPDATED',
  'BOOKING_STATUS_UPDATED',
  'BOOKING_ASSIGNED',
  'BROADCAST_SENT',
  'INCIDENT_CREATED',
  'INCIDENT_ASSIGNED',
  'INCIDENT_ACKNOWLEDGED',
  'INCIDENT_SNOOZED',
  'INCIDENT_RESOLVED',
  'SPECIAL_CREATED',
  'SPECIAL_APPROVED',
  'SPECIAL_ACTIVATED',
  'SPECIAL_DEACTIVATED',
  'SPECIAL_REDEEMED',
  'SPECIAL_UPDATED',
  'SPECIAL_DELETED'
];

export const PAGE_SIZE = 10;
export const DEFAULT_UNASSIGNED_SLA_MINUTES = 15;
export const DEFAULT_STALE_STATUS_SLA_MINUTES = 30;
