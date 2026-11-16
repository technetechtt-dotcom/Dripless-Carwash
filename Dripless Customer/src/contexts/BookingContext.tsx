import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { bookingApi, paymentsApi, subscribePlatformEvents } from '@shared/api';
import { isBookingLifecycleEvent } from '@shared/events';
import { getActiveSession } from '@shared/session';
import { toCustomerBookingStatus } from '@shared/status';
import { notify } from '../utils/notify';
import type { BookingContract } from '@shared/types';
export interface Booking {
  id: string;
  service: string;
  option: string;
  price: number;
  basePrice?: number;
  specialDiscountAmount?: number;
  appliedSpecialPromoCode?: string | null;
  date: string;
  time: string;
  location: string;
  pickupCoordinates?: { lat: number; lng: number } | null;
  destinationLocation?: string | null;
  destinationCoordinates?: { lat: number; lng: number } | null;
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  ecoPoints: number;
  createdAt: string;
}
interface BookingContextType {
  bookings: Booking[];
  activeBookings: Booking[];
  completedBookings: Booking[];
  addBooking: (
  booking: Omit<Booking, 'id' | 'status' | 'ecoPoints' | 'createdAt'>)
  => Promise<Booking>;
  /** Refetch a single booking from the backend (server is authoritative). */
  refreshBooking: (id: string) => Promise<Booking | null>;
  cancelBooking: (id: string, reason?: string) => Promise<Booking>;
  walletBalance: number;
  transactions: Transaction[];
  realtimeState: 'connected' | 'reconnecting' | 'stopped' | 'idle';
}
export interface Transaction {
  id: string;
  type: 'service' | 'topup' | 'reward' | 'refund';
  title: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending';
}
const BookingContext = createContext<BookingContextType | undefined>(undefined);
export const useBookings = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
};
export const BookingProvider = ({ children }: {children: ReactNode;}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [realtimeState, setRealtimeState] = useState<'connected' | 'reconnecting' | 'stopped' | 'idle'>('idle');
  const session = getActiveSession();
  const customerId = session?.payload.userId ?? '';
  const customerName = session?.payload.email;

  const toUiBooking = useMemo(
    () => (contract: BookingContract): Booking => {
      const [datePart = '', timePart = ''] = (contract.scheduledAt ?? '').split(' ');
      return {
        id: contract.id,
        service: contract.serviceName,
        option: contract.optionName,
        price: contract.price,
        basePrice: contract.basePrice ?? contract.price,
        specialDiscountAmount: contract.specialDiscountAmount ?? 0,
        appliedSpecialPromoCode: contract.appliedSpecialPromoCode ?? null,
        date: datePart || new Date(contract.createdAt).toISOString().slice(0, 10),
        time: timePart || 'ASAP',
        location: contract.pickupLocation,
        pickupCoordinates: contract.pickupCoordinates ?? null,
        destinationLocation: contract.destinationLocation ?? null,
        destinationCoordinates: contract.destinationCoordinates ?? null,
        paymentMethod: contract.paymentMethod,
        status: toCustomerBookingStatus(contract.status),
        ecoPoints: contract.ecoPoints,
        createdAt: contract.createdAt
      };
    },
    []
  );

  const loadBookings = useCallback(async () => {
    if (!customerId) {
      setBookings([]);
      return;
    }
    try {
      const contracts = await bookingApi.listBookingsForCustomer(customerId);
      setBookings(contracts.map(toUiBooking));
    } catch {
      /* keep last good snapshot on transient failures */
    }
  }, [customerId, toUiBooking]);

  const refreshBooking = useCallback(async (id: string) => {
    try {
      const contract = await bookingApi.getBooking(id);
      if (!contract) return null;
      const ui = toUiBooking(contract);
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === id);
        if (!exists) return [ui, ...prev];
        return prev.map((b) => (b.id === id ? ui : b));
      });
      return ui;
    } catch {
      return null;
    }
  }, [toUiBooking]);

  const refreshWallet = useCallback(async () => {
    if (!customerId) {
      setWalletBalance(0);
      setTransactions([]);
      return;
    }
    try {
      const wallet = await paymentsApi.wallet();
      setWalletBalance(wallet.walletBalance);
      setTransactions(wallet.transactions.map((entry) => {
        const type: Transaction['type'] =
          entry.type === 'REFUND' ? 'refund' :
          entry.type === 'PROMO_CREDIT' ? 'reward' :
          ['PAYMENT', 'DEBIT', 'PAYOUT'].includes(entry.type) ? 'service' : 'topup';
        return {
          id: entry.id,
          type,
          title: entry.note || entry.reference || entry.type.replace(/_/g, ' ').toLowerCase(),
          date: new Date(entry.createdAt).toLocaleString(),
          amount: entry.amountZar,
          status: 'completed' as const
        };
      }));
    } catch {
      setWalletBalance(0);
      setTransactions([]);
    }
  }, [customerId]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  // Realtime primary; polling is reconciliation fallback only.
  useEffect(() => {
    if (!customerId) return;
    const stop = subscribePlatformEvents(
      (event) => {
        if (!isBookingLifecycleEvent(event.type) && event.type !== 'booking.message') return;
        const bookingId = String(event.payload.bookingId || '');
        if (bookingId) {
          void refreshBooking(bookingId);
        } else {
          void loadBookings();
        }
        if (event.type === 'booking.payment' || event.type === 'payment.status') {
          void refreshWallet();
        }
      },
      setRealtimeState
    );
    const poll = window.setInterval(() => {
      void loadBookings();
    }, 60_000);
    return () => {
      stop();
      window.clearInterval(poll);
    };
  }, [customerId, loadBookings, refreshBooking, refreshWallet]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);
  const activeBookings = bookings.filter(
    (b) =>
    b.status === 'pending' ||
    b.status === 'confirmed' ||
    b.status === 'in-progress'
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const addBooking = useCallback(async (
  bookingData: Omit<Booking, 'id' | 'status' | 'ecoPoints' | 'createdAt'>) =>
  {
    if (!customerId) throw new Error('Sign in before creating a booking');
    const createdBooking = await bookingApi.createBooking({
      customerId,
      customerName,
      serviceName: bookingData.service,
      optionName: bookingData.option,
      pickupLocation: bookingData.location,
      pickupCoordinates: bookingData.pickupCoordinates,
      destinationLocation: bookingData.destinationLocation,
      destinationCoordinates: bookingData.destinationCoordinates,
      paymentMethod: bookingData.paymentMethod,
      price: bookingData.price,
      basePrice: bookingData.basePrice,
      specialDiscountAmount: bookingData.specialDiscountAmount,
      appliedSpecialPromoCode: bookingData.appliedSpecialPromoCode,
      scheduledDate: bookingData.date,
      scheduledTime: bookingData.time
    });
    const newBooking = toUiBooking(createdBooking);
    setBookings((prev) => [newBooking, ...prev]);
    notify.success(
      'Booking confirmed!',
      `${bookingData.service} scheduled for ${bookingData.date} at ${bookingData.time}`
    );
    return newBooking;
  }, [customerId, customerName, toUiBooking]);
  const cancelBooking = async (id: string, reason?: string) => {
    const cancelled = toUiBooking(await bookingApi.cancelBooking(id, reason));
    setBookings((prev) => prev.map((booking) => booking.id === id ? cancelled : booking));
    notify.info('Booking cancelled. Any eligible refund will be processed to the original payment method.');
    await refreshWallet();
    return cancelled;
  };
  return (
    <BookingContext.Provider
      value={{
        bookings,
        activeBookings,
        completedBookings,
        addBooking,
        refreshBooking,
        cancelBooking,
        walletBalance,
        transactions,
        realtimeState
      }}>

      {children}
    </BookingContext.Provider>);

};
