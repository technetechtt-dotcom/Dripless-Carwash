/**
 * Shared booking DTO mapper used by bookings/drivers/ops routes.
 */
import type { BookingStatus } from '@prisma/client';
import { fromCents } from '../money.js';

export function serviceSlugToType(serviceSlug: string): string {
  const s = serviceSlug.toLowerCase();
  if (s.includes('taxi') || s.includes('ride')) return 'RIDE';
  if (s.includes('parcel') || s.includes('delivery')) return 'PARCEL';
  if (s.includes('wash') || s.includes('car-wash')) return 'WASH';
  return 'HOME_SERVICE';
}

export function mapBookingDto(booking: {
  id: string;
  customerId: string;
  driverId: string | null;
  serviceSlug: string;
  serviceName: string;
  optionSlug?: string;
  optionName: string;
  status: BookingStatus | string;
  price: number;
  basePrice?: number;
  discountAmount?: number;
  promoCode?: string | null;
  ecoPoints?: number;
  pickupLocation: string;
  destinationLocation: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string;
  pooledWithBookingId?: string | null;
  dispatchAttemptCount?: number;
  dispatchReason?: string | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { name?: string | null } | null;
}) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    customerName: booking.customer?.name,
    driverId: booking.driverId,
    serviceType: serviceSlugToType(booking.serviceSlug),
    serviceName: booking.serviceName,
    optionName: booking.optionName,
    status: booking.status,
    reference: 'reference' in booking ? (booking as { reference?: string }).reference : undefined,
    price: fromCents(booking.price),
    basePrice: fromCents(booking.basePrice ?? booking.price),
    discountAmount: fromCents(booking.discountAmount ?? 0),
    specialDiscountAmount: fromCents(booking.discountAmount ?? 0),
    promoCode: booking.promoCode ?? null,
    appliedSpecialPromoCode: booking.promoCode ?? null,
    ecoPoints: booking.ecoPoints ?? 0,
    pickupLocation: booking.pickupLocation,
    destinationLocation: booking.destinationLocation,
    pickupCoordinates:
      booking.pickupLat != null && booking.pickupLng != null
        ? { lat: booking.pickupLat, lng: booking.pickupLng }
        : null,
    destinationCoordinates:
      booking.destinationLat != null && booking.destinationLng != null
        ? { lat: booking.destinationLat, lng: booking.destinationLng }
        : null,
    paymentMethod: booking.paymentMethod ?? null,
    paymentStatus: booking.paymentStatus ?? 'UNPAID',
    pooledWithBookingId: booking.pooledWithBookingId ?? null,
    dispatchAttemptCount: booking.dispatchAttemptCount ?? 0,
    dispatchReason: booking.dispatchReason ?? null,
    scheduledAt: booking.scheduledAt ? booking.scheduledAt.toISOString() : undefined,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString()
  };
}

export function mapPromotionDto(row: {
  id: string;
  title: string;
  description: string;
  promoCode: string;
  audience: string;
  serviceScope: string;
  discountType: string;
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  terms: string | null;
  approved: boolean;
  isActive: boolean;
  approvedByAdminId: string | null;
  approvedAt: Date | null;
  redemptionCount: number;
  lastRedeemedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const audience =
    row.audience === 'both' ? 'all' : (row.audience as 'customer' | 'driver' | 'all');
  const scopeMap: Record<string, string> = {
    ALL: 'ALL',
    CAR_WASH: 'CAR_WASH',
    TAXI: 'RIDE',
    DELIVERY: 'PARCEL',
    WINDOW_SOLAR: 'HOME_SERVICE',
    HOME_SERVICE: 'HOME_SERVICE'
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    promoCode: row.promoCode,
    audience,
    serviceScope: scopeMap[row.serviceScope] || row.serviceScope,
    discountType: row.discountType,
    discountValue: row.discountValue,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    termsAndConditions: row.terms || '',
    approved: row.approved,
    isActive: row.isActive,
    approvedByAdminId: row.approvedByAdminId,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdByAdminId: row.approvedByAdminId || 'system',
    redemptionCount: row.redemptionCount,
    lastRedeemedAt: row.lastRedeemedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapCustomerProfile(row: {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  walletBalance: number;
  ecoPoints: number;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string } | null;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.user?.email || '',
    phone: row.phone ?? undefined,
    walletBalance: fromCents(row.walletBalance),
    walletBalanceCents: row.walletBalance,
    ecoPoints: row.ecoPoints,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapDriverProfile(row: {
  id: string;
  name: string;
  phone?: string | null;
  vehicle: string;
  rating: number;
  ecoPoints: number;
  status: string;
  verificationStatus: string;
  activeBookingId: string | null;
  avatarUrl: string | null;
  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string } | null;
  location?: {
    lat: number;
    lng: number;
    heading: number | null;
    speedKph: number | null;
    updatedAt: Date;
  } | null;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.user?.email || '',
    vehicle: row.vehicle,
    rating: row.rating,
    ecoPoints: row.ecoPoints,
    memberSince: row.memberSince.toISOString().slice(0, 10),
    avatarUrl: row.avatarUrl ?? undefined,
    status: row.status,
    verificationStatus: row.verificationStatus,
    activeBookingId: row.activeBookingId,
    lastKnownLocation: row.location
      ? {
          lat: row.location.lat,
          lng: row.location.lng,
          heading: row.location.heading,
          speedKph: row.location.speedKph,
          updatedAt: row.location.updatedAt.toISOString()
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
