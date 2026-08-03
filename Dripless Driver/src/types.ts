import type { BookingStatus as SharedBookingStatus } from '@shared/types';

export type JobType = 'RIDE' | 'WASH' | 'PARCEL' | 'HOME_SERVICE';

export type JobStatus = SharedBookingStatus;

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  customerName: string;
  customerRating: number;
  pickupLocation: string;
  pickupCoordinates?: { lat: number; lng: number } | null;
  dropoffLocation?: string;
  destinationCoordinates?: { lat: number; lng: number } | null;
  pooledWithBookingId?: string | null;
  dispatchReason?: string | null;
  earnings: number;
  distance: string;
  duration: string;
  timestamp: string;
  vehicle?: string;
  parcelSize?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicle: string;
  plateNumber?: string;
  rating: number;
  ecoPoints: number;
  memberSince: string;
  avatarUrl?: string;
}

export interface Booking extends Job {
  service: string;
  userName: string;
  price: number;
  ecoPoints: number;
  createdAt: string;
}

export interface EcoStats {
  co2Saved: number; // in kg
  treesSaved: number;
  waterSaved: number; // in liters
  totalEcoPoints: number;
  weeklyData: {day: string;points: number;}[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: number;
  icon: 'leaf' | 'droplet' | 'wind' | 'zap';
}

export interface DriverStats {
  todayEarnings: number;
  todayJobs: number;
  todayHours: number;
  weeklyEarnings: number;
  rating: number;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number;
  vehicle: string;
  memberSince: string;
}

export interface DriverDocument {
  id: string;
  title: string;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'MISSING';
  expiryDate?: string;
  uploadDate?: string;
}

export interface PerformanceStats {
  acceptanceRate: number;
  cancellationRate: number;
  onTimeRate: number;
  rating: number;
  totalRides: number;
}

export interface Message {
  id: string;
  sender: 'driver' | 'customer';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface VehicleVerificationData {
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  photos: string[];
}