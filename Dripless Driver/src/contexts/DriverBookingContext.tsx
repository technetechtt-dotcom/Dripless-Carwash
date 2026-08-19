import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  apiRuntimeConfig,
  bookingApi,
  bookingProofApi,
  driverOperationsApi,
  notificationApi,
  subscribePlatformEvents,
  trackingApi
} from '@shared/api';
import { interpolateGeoPoint, textToGeoPoint } from '@shared/maps';
import { Booking, Job, JobStatus, PerformanceStats, Message } from '../types';
import { normaliseGpsSample } from '../utils/gps';
import { useDriverAuth } from './DriverAuthContext';
import { useToast } from './ToastContext';
import type { BookingContract } from '@shared/types';
interface DriverBookingContextType {
  // Job State
  isOnline: boolean;
  setIsOnline: (val: boolean) => Promise<void>;
  activeJob: Job | null;
  incomingJob: Job | null;
  jobToRate: Job | null;
  // Job Actions
  simulateJobRequest: () => Promise<void>;
  acceptJob: () => Promise<void>;
  declineJob: () => Promise<void>;
  updateJobStatus: (status: JobStatus) => Promise<void>;
  submitRating: (rating: number, feedback?: string) => void;
  closeRatingModal: () => void;
  // Booking History & Stats
  availableBookings: Booking[];
  acceptedBookings: Booking[];
  completedBookings: Booking[];
  earnings: number;
  fetchAvailableBookings: () => void;
  // Performance & Chat
  performanceStats: PerformanceStats;
  messages: Message[];
  sendMessage: (text: string) => void;
  markMessagesRead: () => void;
}
const DriverBookingContext = createContext<
  DriverBookingContextType | undefined>(
  undefined);
export const useDriverBookings = () => {
  const context = useContext(DriverBookingContext);
  if (!context) {
    throw new Error(
      'useDriverBookings must be used within a DriverBookingProvider'
    );
  }
  return context;
};
export const DriverBookingProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const mapContractToJob = (contract: BookingContract): Job => ({
    id: contract.id,
    type:
      contract.serviceType === 'WASH' ?
      'WASH' :
      contract.serviceType === 'PARCEL' ?
      'PARCEL' :
      contract.serviceType === 'HOME_SERVICE' ?
      'HOME_SERVICE' :
      'RIDE',
    status: contract.status,
    customerName: contract.customerName || 'Customer',
    customerRating: contract.customerRating || 4.8,
    pickupLocation: contract.pickupLocation,
    pickupCoordinates: contract.pickupCoordinates ?? null,
    dropoffLocation: contract.destinationLocation || undefined,
    destinationCoordinates: contract.destinationCoordinates ?? null,
    pooledWithBookingId: contract.pooledWithBookingId ?? null,
    dispatchReason: contract.latestAudit?.reason ?? null,
    earnings: Number((contract.price * 0.85).toFixed(2)),
    distance: contract.distance || '2.4 km',
    duration: contract.duration || '12 min',
    timestamp: contract.createdAt
  });
  const { driver } = useDriverAuth();
  const { showToast } = useToast();
  // App State
  const [isOnline, setOnlineState] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [incomingJob, setIncomingJob] = useState<Job | null>(null);
  const [jobToRate, setJobToRate] = useState<Job | null>(null);
  // Existing Booking Context State
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState(0);
  const performanceStats = useMemo<PerformanceStats>(() => {
    const totalCompleted = completedBookings.length;
    const completionRate = totalCompleted > 0 ? 100 : 0;
    return {
      acceptanceRate: activeJob || incomingJob || totalCompleted > 0 ? 100 : 0,
      cancellationRate: 0,
      onTimeRate: completionRate,
      rating: totalCompleted > 0 ? 4.9 : 0,
      totalRides: totalCompleted
    };
  }, [activeJob, completedBookings.length, incomingJob]);
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const loadMessages = useCallback(async (bookingId: string) => {
    const rows = await bookingProofApi.messages(bookingId);
    setMessages(rows.map((row) => ({
      id: String(row.id),
      sender: row.senderRole === 'driver' ? 'driver' : 'customer',
      text: String(row.body),
      timestamp: String(row.createdAt),
      read: row.senderRole === 'driver'
    })));
  }, []);
  const sendMessage = (text: string) => {
    const body = text.trim();
    if (!activeJob || !body) return;
    void bookingProofApi.sendMessage(activeJob.id, body)
      .then(() => loadMessages(activeJob.id))
      .catch((error) => showToast(error instanceof Error ? error.message : 'Message could not be sent', 'error'));
  };
  const markMessagesRead = () => {
    setMessages((prev) =>
    prev.map((m) => ({
      ...m,
      read: true
    }))
    );
  };

  useEffect(() => {
    if (!activeJob) {
      setMessages([]);
      return;
    }
    void loadMessages(activeJob.id).catch((error) =>
      showToast(error instanceof Error ? error.message : 'Messages could not be loaded', 'error')
    );
  }, [activeJob?.id, loadMessages]);

  useEffect(() => {
    if (!driver?.id || !isOnline) {
      return;
    }

    const publishPoint = async (
      lat: number,
      lng: number,
      speedKph?: number | null,
      heading?: number | null,
      accuracyM?: number | null,
      recordedAt?: string
    ) => {
      await trackingApi.updateDriverLocation({
        driverId: driver.id,
        lat,
        lng,
        speedKph: speedKph ?? null,
        heading: heading ?? null,
        accuracyM: accuracyM ?? null,
        recordedAt
      });
    };

    const emitSimulatedLocation = async () => {
      if (activeJob) {
        const pickup =
          activeJob.pickupCoordinates ?? textToGeoPoint(activeJob.pickupLocation, 401);
        const destination =
          activeJob.destinationCoordinates ??
          textToGeoPoint(activeJob.dropoffLocation || activeJob.pickupLocation, 403);
        const progress =
          activeJob.status === 'EN_ROUTE' ?
          0.35 :
          activeJob.status === 'ARRIVED' ?
          0.62 :
          activeJob.status === 'IN_PROGRESS' ?
          0.84 :
          activeJob.status === 'COMPLETED' ?
          1 :
          0.2;
        const point = interpolateGeoPoint(pickup, destination, progress);
        await publishPoint(
          point.lat,
          point.lng,
          activeJob.status === 'IN_PROGRESS' ? 8 : 32
        );
        return;
      }

      const base = textToGeoPoint(driver.id, 499);
      await publishPoint(base.lat, base.lng, 0);
    };

    let intervalId: number | null = null;
    let watchId: number | null = null;

    const startFallbackInterval = () => {
      void emitSimulatedLocation();
      intervalId = window.setInterval(() => {
        void emitSimulatedLocation();
      }, 10000);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          try {
            const sample = normaliseGpsSample(position);
            void publishPoint(
              sample.lat,
              sample.lng,
              sample.speedKph,
              sample.heading,
              sample.accuracyM,
              sample.recordedAt
            );
          } catch (cause) {
            void driverOperationsApi.setOnline(false).catch(() => undefined);
            setOnlineState(false);
            showToast(cause instanceof Error ? cause.message : 'GPS sample was rejected', 'error');
          }
        },
        () => {
          if (apiRuntimeConfig.isMockEnabled() && intervalId === null) {
            startFallbackInterval();
          } else {
            void driverOperationsApi.setOnline(false).catch(() => undefined);
            setOnlineState(false);
            showToast('GPS permission or signal was lost. You are offline.', 'error');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    } else if (apiRuntimeConfig.isMockEnabled()) {
      startFallbackInterval();
    } else {
      void driverOperationsApi.setOnline(false).catch(() => undefined);
      setOnlineState(false);
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeJob, driver?.id, isOnline]);

  useEffect(() => {
    if (!driver?.id || !isOnline || activeJob || incomingJob) {
      return;
    }
    let cancelled = false;
    const pollAssignedJobs = async () => {
      try {
        const booking = await bookingApi.createIncomingDriverJob(driver.id);
        if (cancelled) return;
        if (booking && ['PENDING', 'CONFIRMED'].includes(booking.status) && booking.driverId === driver.id) {
          setIncomingJob(mapContractToJob(booking));
        }
      } catch {
        // keep silent; polling retries
      }
    };
    void pollAssignedJobs();
    const interval = window.setInterval(() => {
      void pollAssignedJobs();
    }, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJob, driver?.id, incomingJob, isOnline]);
  // Job Logic
  const simulateJobRequest = async () => {
    if (activeJob || incomingJob || !isOnline) {
      if (!isOnline) showToast('You must be online to receive jobs', 'error');
      return;
    }
    if (!driver) return;
    const contract = await bookingApi.createIncomingDriverJob(driver.id);
    if (!contract) {
      showToast('No assigned jobs are waiting right now', 'info');
      return;
    }
    setIncomingJob(mapContractToJob(contract));
  };
  const acceptJob = async () => {
    if (incomingJob) {
      const accepted = await driverOperationsApi.acceptJob(incomingJob.id);
      setActiveJob(mapContractToJob(accepted));
      setIncomingJob(null);
      showToast('Job accepted! Navigation starting...', 'success');
    }
  };
  const declineJob = async () => {
    if (incomingJob) {
      await driverOperationsApi.declineJob(incomingJob.id, 'Driver unavailable for this offer');
    }
    setIncomingJob(null);
    showToast('Job declined', 'info');
  };
  const updateJobStatus = async (newStatus: JobStatus) => {
    if (activeJob) {
      await bookingApi.updateBookingStatus(activeJob.id, newStatus, 'driver');
      if (newStatus === 'COMPLETED') {
        const completedBooking: Booking = {
          ...activeJob,
          service:
          activeJob.type === 'RIDE' ?
          'Dripless Ride' :
          activeJob.type === 'WASH' ?
          'Dripless Wash' :
          activeJob.type === 'HOME_SERVICE' ?
          'Dripless Home Service' :
          'Dripless Parcel',
          userName: 'user_123',
          price: activeJob.earnings * 1.2,
          ecoPoints: 50,
          createdAt: activeJob.timestamp,
          status: 'COMPLETED'
        };
        setCompletedBookings((prev) => [completedBooking, ...prev]);
        setEarnings((prev) => prev + activeJob.earnings);
        setJobToRate(activeJob);
        setActiveJob(null);
        if (driver) {
          void notificationApi.createNotification({
            role: 'driver',
            userId: driver.id,
            title: 'Job completed',
            message: `You earned $${activeJob.earnings.toFixed(2)}.`,
            type: 'success'
          });
        }
      } else {
        setActiveJob({
          ...activeJob,
          status: newStatus
        });
      }
    }
  };
  const submitRating = (rating: number, feedback?: string) => {
    console.log(
      `Rated job ${jobToRate?.id} with ${rating} stars. Feedback: ${feedback}`
    );
    setJobToRate(null);
  };
  const closeRatingModal = () => {
    setJobToRate(null);
  };
  const fetchAvailableBookings = () => {
    const nextBookings: Booking[] = [];
    if (incomingJob) {
      nextBookings.push({
        ...incomingJob,
        service:
          incomingJob.type === 'RIDE' ?
          'Dripless Ride' :
          incomingJob.type === 'WASH' ?
          'Dripless Wash' :
          incomingJob.type === 'HOME_SERVICE' ?
          'Dripless Home Service' :
          'Dripless Parcel',
        userName: incomingJob.customerName.toLowerCase().replace(/\s+/g, '_'),
        price: Number((incomingJob.earnings / 0.85).toFixed(2)),
        ecoPoints: Math.max(10, Math.round(incomingJob.earnings * 4)),
        createdAt: incomingJob.timestamp
      });
    }
    setAvailableBookings(nextBookings);
  };
  const setIsOnline = async (next: boolean) => {
    if (!driver) return;
    if (!next) {
      if (apiRuntimeConfig.isRemoteEnabled()) await driverOperationsApi.setOnline(false);
      setOnlineState(false);
      return;
    }
    if (apiRuntimeConfig.isRemoteEnabled()) {
      if (!navigator.geolocation) throw new Error('GPS is not available on this device');
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        })
      );
      const sample = normaliseGpsSample(position);
      await trackingApi.updateDriverLocation({
        driverId: driver.id,
        ...sample
      });
      await driverOperationsApi.setOnline(true);
    }
    setOnlineState(true);
  };

  useEffect(() => {
    if (!driver?.id || !apiRuntimeConfig.isRemoteEnabled()) return;
    return subscribePlatformEvents((event) => {
      const bookingId = String(event.payload.bookingId || '');
      if (event.type === 'booking.assigned' && event.payload.driverId === driver.id) {
        void bookingApi.createIncomingDriverJob(driver.id).then((booking) => {
          if (booking) setIncomingJob(mapContractToJob(booking));
        });
      }
      if (activeJob && bookingId === activeJob.id && event.type === 'booking.status') {
        setActiveJob((current) => current ? { ...current, status: String(event.payload.status) as JobStatus } : null);
      }
      if (activeJob && bookingId === activeJob.id && event.type === 'booking.message') {
        void loadMessages(activeJob.id);
      }
    });
  }, [activeJob?.id, driver?.id, loadMessages]);
  return (
    <DriverBookingContext.Provider
      value={{
        isOnline,
        setIsOnline,
        activeJob,
        incomingJob,
        jobToRate,
        simulateJobRequest,
        acceptJob,
        declineJob,
        updateJobStatus,
        submitRating,
        closeRatingModal,
        availableBookings,
        acceptedBookings,
        completedBookings,
        fetchAvailableBookings,
        earnings,
        performanceStats,
        messages,
        sendMessage,
        markMessagesRead
      }}>

      {children}
    </DriverBookingContext.Provider>);

};
