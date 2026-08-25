import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  apiRuntimeConfig,
  bookingApi,
  bookingProofApi,
  driverOperationsApi,
  notificationApi,
  subscribePlatformEvents,
  trackingApi
} from '@shared/api';
import { formatZar } from '@shared/currency';
import { isBookingLifecycleEvent } from '@shared/events';
import { interpolateGeoPoint, textToGeoPoint } from '@shared/maps';
import { Booking, Job, JobStatus, PerformanceStats, Message } from '../types';
import { normaliseGpsSample } from '../utils/gps';
import { startDriverLocationWatch } from '../utils/nativeLocation';
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
    customerRating: typeof contract.customerRating === 'number' ? contract.customerRating : 0,
    pickupLocation: contract.pickupLocation,
    pickupCoordinates: contract.pickupCoordinates ?? null,
    dropoffLocation: contract.destinationLocation || undefined,
    destinationCoordinates: contract.destinationCoordinates ?? null,
    pooledWithBookingId: contract.pooledWithBookingId ?? null,
    dispatchReason: contract.latestAudit?.reason ?? null,
    earnings: typeof contract.driverEarningsZar === 'number' ? contract.driverEarningsZar : 0,
    rating: typeof contract.rating === 'number' ? contract.rating : undefined,
    distance: contract.distance || '',
    duration: contract.duration || '',
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
    // `rating` on completed jobs is the customer→driver score for that booking.
    const rated = completedBookings.filter((b) => typeof b.rating === 'number' && b.rating > 0);
    const avgRating =
      rated.length > 0 ? rated.reduce((sum, b) => sum + (b.rating as number), 0) / rated.length : 0;
    return {
      acceptanceRate: activeJob || incomingJob || totalCompleted > 0 ? 100 : 0,
      cancellationRate: 0,
      onTimeRate: completionRate,
      rating: rated.length ? Math.round(avgRating * 10) / 10 : 0,
      totalRides: totalCompleted
    };
  }, [activeJob, completedBookings, incomingJob]);
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
    let stopWatch: (() => void) | null = null;
    let cancelled = false;

    const startFallbackInterval = () => {
      void emitSimulatedLocation();
      intervalId = window.setInterval(() => {
        void emitSimulatedLocation();
      }, 10000);
    };

    const goOffline = (message: string) => {
      if (apiRuntimeConfig.isMockEnabled() && intervalId === null) {
        startFallbackInterval();
        return;
      }
      void driverOperationsApi.setOnline(false).catch(() => undefined);
      setOnlineState(false);
      showToast(message, 'error');
    };

    void startDriverLocationWatch({
      onSample: (sample) => {
        void publishPoint(
          sample.lat,
          sample.lng,
          sample.speedKph,
          sample.heading,
          sample.accuracyM,
          sample.recordedAt
        );
      },
      onError: (message) => {
        if (cancelled) return;
        goOffline(message.includes('offline') ? message : `${message}. You are offline.`);
      }
    })
      .then((handle) => {
        if (cancelled) {
          handle.stop();
          return;
        }
        stopWatch = handle.stop;
      })
      .catch(() => {
        if (cancelled) return;
        if (apiRuntimeConfig.isMockEnabled()) {
          startFallbackInterval();
        } else {
          goOffline('GPS failed to start. You are offline.');
        }
      });

    return () => {
      cancelled = true;
      stopWatch?.();
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
  const refreshEarnings = useCallback(async () => {
    if (!apiRuntimeConfig.isRemoteEnabled()) return;
    try {
      const summary = await driverOperationsApi.payoutSummary();
      const available = Number(summary.availableZar ?? 0);
      setEarnings(Number.isFinite(available) ? available : 0);
    } catch {
      /* keep last known earnings */
    }
  }, []);

  useEffect(() => {
    if (!driver?.id) return;
    void refreshEarnings();
  }, [driver?.id, refreshEarnings]);

  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!activeJob) return;
    const updated = await bookingApi.updateBookingStatus(activeJob.id, newStatus, 'driver');
    if (!updated) {
      showToast('Could not update job status', 'error');
      return;
    }
    if (newStatus === 'COMPLETED') {
      const authoritative =
        (await bookingApi.getBooking(activeJob.id).catch(() => null)) ?? updated;
      const completedBooking: Booking = {
        ...mapContractToJob(authoritative),
        service: authoritative.serviceName,
        userName: (authoritative.customerName || 'customer').toLowerCase().replace(/\s+/g, '_'),
        price: authoritative.price,
        ecoPoints: authoritative.ecoPoints,
        createdAt: authoritative.createdAt
      };
      setCompletedBookings((prev) => [completedBooking, ...prev]);
      await refreshEarnings();
      setJobToRate(mapContractToJob(authoritative));
      setActiveJob(null);
      if (driver) {
        const net =
          typeof authoritative.driverEarningsZar === 'number'
            ? authoritative.driverEarningsZar
            : 0;
        void notificationApi.createNotification({
          role: 'driver',
          userId: driver.id,
          title: 'Job completed',
          message: `You earned ${formatZar(net)}.`,
          type: 'success'
        });
      }
    } else {
      setActiveJob(mapContractToJob(updated));
    }
  };
  const submitRating = (rating: number, feedback?: string) => {
    const job = jobToRate;
    if (!job) return;
    setJobToRate(null);
    if (!apiRuntimeConfig.isRemoteEnabled()) {
      showToast('Remote API required to persist ratings', 'error');
      return;
    }
    void bookingProofApi
      .rateCustomer(job.id, rating, feedback)
      .then(() => {
        showToast('Customer rating saved', 'success');
        setCompletedBookings((prev) =>
          prev.map((entry) =>
            entry.id === job.id ? { ...entry, customerRating: rating } : entry
          )
        );
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : 'Could not save rating', 'error');
      });
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
        price: incomingJob.earnings,
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
      let sample;
      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          throw new Error('Location permission is required to go online');
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0
        });
        sample = normaliseGpsSample({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 999,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          } as GeolocationCoordinates,
          timestamp: position.timestamp
        });
      } else {
        if (!navigator.geolocation) throw new Error('GPS is not available on this device');
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
          })
        );
        sample = normaliseGpsSample(position);
      }
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
        void bookingApi.getBooking(bookingId).then((booking) => {
          if (!booking) return;
          if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
            setActiveJob(null);
            if (booking.status === 'COMPLETED') {
              void refreshEarnings();
            }
            return;
          }
          setActiveJob(mapContractToJob(booking));
        });
      }
      if (activeJob && bookingId === activeJob.id && event.type === 'booking.message') {
        void loadMessages(activeJob.id);
      }
      if (isBookingLifecycleEvent(event.type) && event.type === 'booking.status') {
        void refreshEarnings();
      }
    });
  }, [activeJob?.id, driver?.id, loadMessages, refreshEarnings]);
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

