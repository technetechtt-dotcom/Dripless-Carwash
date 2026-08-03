import type { BookingStatus } from '@prisma/client';
import { HttpError } from '../middleware/error.js';

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'EN_ROUTE'],
  CONFIRMED: ['EN_ROUTE', 'CANCELLED', 'PENDING'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function assertStatusTransition(from: BookingStatus, to: BookingStatus) {
  if (from === to) return;
  if (!TRANSITIONS[from].includes(to)) {
    throw new HttpError(400, `Invalid status transition ${from} -> ${to}`);
  }
}
