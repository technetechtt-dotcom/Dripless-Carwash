export type AppRole = 'customer' | 'driver' | 'ops_admin';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ServiceType = 'RIDE' | 'WASH' | 'PARCEL' | 'HOME_SERVICE';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_REVIEW';
export type DriverVerificationStatus =
  | 'VERIFIED'
  | 'PENDING'
  | 'REJECTED'
  | 'EXPIRED';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | string;
  refreshExpiresAt?: number | string;
}

export interface SessionPayload {
  userId: string;
  role: AppRole;
  email: string;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthSession {
  tokens: SessionTokens;
  payload: SessionPayload;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  walletBalance: number;
  ecoPoints: number;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  vehicle: string;
  plateNumber?: string | null;
  rating: number;
  ecoPoints: number;
  memberSince: string;
  avatarUrl?: string;
  status: AccountStatus;
  verificationStatus: DriverVerificationStatus;
  activeBookingId?: string | null;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    heading?: number | null;
    speedKph?: number | null;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsAdminProfile {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  mfaEnrollmentRequired?: boolean;
}

export interface AdminAudit {
  updatedBy: string;
  updatedByRole: AppRole;
  reason?: string;
  source: 'customer_app' | 'driver_app' | 'ops_admin_dashboard' | 'system';
  at: string;
}

export interface BookingContract {
  id: string;
  reference?: string;
  customerId?: string;
  driverId?: string;
  serviceType: ServiceType;
  serviceName: string;
  optionName: string;
  pickupLocation: string;
  pickupCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  destinationLocation?: string | null;
  destinationCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  paymentMethod: string;
  paymentStatus?: string;
  price: number;
  basePrice?: number;
  specialDiscountAmount?: number;
  appliedSpecialPromoCode?: string | null;
  ecoPoints: number;
  status: BookingStatus;
  customerName?: string;
  customerRating?: number;
  distance?: string;
  duration?: string;
  pooledWithBookingId?: string | null;
  dispatchAttemptCount?: number;
  createdAt: string;
  scheduledAt: string;
  updatedAt: string;
  latestAudit?: AdminAudit;
}

export interface BookingTrackingSnapshot {
  bookingId: string;
  status: BookingStatus;
  serviceType: ServiceType;
  pickupLocation: string;
  destinationLocation?: string | null;
  pickupCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  destinationCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  driverId?: string;
  driverName?: string;
  driverPhone?: string | null;
  driverVehicle?: string | null;
  driverPlateNumber?: string | null;
  driverRating?: number | null;
  driverAvatarUrl?: string | null;
  driverCompletedJobs?: number;
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number | null;
    speedKph?: number | null;
    updatedAt: string;
  } | null;
}

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationContract {
  id: string;
  role: AppRole;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export type SpecialAudience = 'customer' | 'driver' | 'all';
export type SpecialDiscountType = 'PERCENT' | 'FIXED';
export type SpecialServiceScope =
  | 'ALL'
  | 'CAR_WASH'
  | 'WINDOW_SOLAR'
  | 'MATTRESS'
  | 'COUCH'
  | 'CARPET'
  | 'RIDE'
  | 'DELIVERY';

export interface OpsSpecial {
  id: string;
  title: string;
  description: string;
  promoCode: string;
  audience: SpecialAudience;
  serviceScope: SpecialServiceScope;
  discountType: SpecialDiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  termsAndConditions: string;
  approved: boolean;
  approvedByAdminId?: string | null;
  approvedAt?: string | null;
  isActive: boolean;
  redemptionCount?: number;
  lastRedeemedAt?: string | null;
  createdByAdminId: string;
  createdByAdminName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsDashboardSummary {
  totalCustomers: number;
  totalDrivers: number;
  activeBookings: number;
  pendingBookings: number;
  completedBookings: number;
  suspendedCustomers: number;
  suspendedDrivers: number;
  pendingDriverVerifications: number;
  unassignedBookings: number;
}

export interface OpsActivityItem {
  id: string;
  type:
    | 'CUSTOMER_STATUS_UPDATED'
    | 'DRIVER_STATUS_UPDATED'
    | 'DRIVER_VERIFICATION_UPDATED'
    | 'BOOKING_STATUS_UPDATED'
    | 'BOOKING_ASSIGNED'
    | 'BROADCAST_SENT'
    | 'INCIDENT_CREATED'
    | 'INCIDENT_ASSIGNED'
    | 'INCIDENT_ACKNOWLEDGED'
    | 'INCIDENT_SNOOZED'
    | 'INCIDENT_RESOLVED'
    | 'SPECIAL_CREATED'
    | 'SPECIAL_APPROVED'
    | 'SPECIAL_ACTIVATED'
    | 'SPECIAL_DEACTIVATED'
    | 'SPECIAL_REDEEMED'
    | 'SPECIAL_UPDATED'
    | 'SPECIAL_DELETED';
  actorId: string;
  actorRole: AppRole;
  targetId: string;
  message: string;
  createdAt: string;
}

export interface OpsAnalytics {
  from: string;
  to: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  completionRate: number;
  avgBookingValue: number;
  revenue: number;
  topServiceType: ServiceType | 'NONE';
}

export interface DriverAssignmentRecommendation {
  driverId: string;
  driverName: string;
  score: number;
  distanceKm?: number;
  etaMinutes?: number;
  reasons: string[];
}

export type DispatchIncidentStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'SNOOZED'
  | 'RESOLVED';

export interface DispatchIncident {
  id: string;
  bookingId: string;
  status: DispatchIncidentStatus;
  severity: 'medium' | 'high';
  reason: string;
  ownerAdminId?: string | null;
  ownerAdminName?: string | null;
  acknowledgedAt?: string | null;
  snoozeUntil?: string | null;
  resolvedAt?: string | null;
  lastEscalatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
