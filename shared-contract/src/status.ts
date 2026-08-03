import type { BookingStatus } from './types';

export type CustomerBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

const customerToBackendMap: Record<CustomerBookingStatus, BookingStatus> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  'in-progress': 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED'
};

const backendToCustomerMap: Record<BookingStatus, CustomerBookingStatus> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  EN_ROUTE: 'in-progress',
  ARRIVED: 'in-progress',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const toBackendBookingStatus = (
  status: CustomerBookingStatus
): BookingStatus => customerToBackendMap[status];

export const toCustomerBookingStatus = (
  status: BookingStatus
): CustomerBookingStatus => backendToCustomerMap[status];
