import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { bookingApi, notificationApi, specialsApi } from '@shared/api';
import { getActiveSession } from '@shared/session';
import {
  toBackendBookingStatus,
  toCustomerBookingStatus,
  type CustomerBookingStatus
} from '@shared/status';
import { notify } from '../utils/notify';
import { formatCurrency } from '../utils/currency';
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
  => Booking;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  cancelBooking: (id: string) => void;
  walletBalance: number;
  addFunds: (amount: number) => void;
  deductFunds: (amount: number) => boolean;
  transactions: Transaction[];
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
const initialTransactions: Transaction[] = [
{
  id: '1',
  type: 'service',
  title: 'Car Wash - Premium',
  date: 'Yesterday, 3:30 PM',
  amount: -24.99,
  status: 'completed'
},
{
  id: '2',
  type: 'topup',
  title: 'Wallet Top-up',
  date: 'May 13, 2:00 PM',
  amount: 50.0,
  status: 'completed'
},
{
  id: '3',
  type: 'service',
  title: 'Eco Taxi',
  date: 'May 12, 10:15 AM',
  amount: -18.5,
  status: 'completed'
},
{
  id: '4',
  type: 'reward',
  title: 'EcoPoints Redemption',
  date: 'May 10, 4:30 PM',
  amount: 5.0,
  status: 'completed'
},
{
  id: '5',
  type: 'service',
  title: 'Window Cleaning',
  date: 'May 5, 2:00 PM',
  amount: -39.99,
  status: 'completed'
}];

export const BookingProvider = ({ children }: {children: ReactNode;}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walletBalance, setWalletBalance] = useState(45.5);
  const [transactions, setTransactions] =
  useState<Transaction[]>(initialTransactions);
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

  useEffect(() => {
    if (!customerId) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    const loadBookings = async () => {
      try {
        const contracts = await bookingApi.listBookingsForCustomer(customerId);
        if (!cancelled) {
          setBookings(contracts.map(toUiBooking));
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
        }
      }
    };
    void loadBookings();
    return () => {
      cancelled = true;
    };
  }, [customerId, toUiBooking]);
  const activeBookings = bookings.filter(
    (b) =>
    b.status === 'pending' ||
    b.status === 'confirmed' ||
    b.status === 'in-progress'
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const addBooking = (
  bookingData: Omit<Booking, 'id' | 'status' | 'ecoPoints' | 'createdAt'>) =>
  {
    const booking = bookingApi.createBooking({
      customerId: customerId || 'anonymous-customer',
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
    if (bookingData.appliedSpecialPromoCode && session?.payload.role === 'customer') {
      void specialsApi.redeemSpecial({
        role: 'customer',
        userId: customerId,
        promoCode: bookingData.appliedSpecialPromoCode
      });
    }

    // The UI keeps local bookings in customer-friendly labels.
    const newBooking: Booking = {
      ...bookingData,
      id: `ECO-${Date.now()}`,
      status: 'pending',
      ecoPoints: Math.round(bookingData.price * 10),
      createdAt: new Date().toISOString()
    };
    setBookings((prev) => [newBooking, ...prev]);
    // Add transaction
    const newTransaction: Transaction = {
      id: `t-${Date.now()}`,
      type: 'service',
      title: `${bookingData.service} - ${bookingData.option}`,
      date: 'Just now',
      amount: -bookingData.price,
      status: 'completed'
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    notify.success(
      'Booking confirmed!',
      `${bookingData.service} scheduled for ${bookingData.date} at ${bookingData.time}`
    );
    void booking.then((createdBooking) => {
      setBookings((prev) =>
        prev.map((existingBooking) =>
          existingBooking.id === newBooking.id ? toUiBooking(createdBooking) : existingBooking
        )
      );
    });
    return newBooking;
  };
  const updateBookingStatus = (id: string, status: Booking['status']) => {
    void bookingApi.updateBookingStatus(
      id,
      toBackendBookingStatus(status as CustomerBookingStatus),
      'customer'
    );
    setBookings((prev) =>
    prev.map((b) =>
    b.id === id ?
    {
      ...b,
      status
    } :
    b
    )
    );
    if (status === 'completed') {
      notify.success('Service completed! EcoPoints earned.');
    }
  };
  const cancelBooking = (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      setBookings((prev) =>
      prev.map((b) =>
      b.id === id ?
      {
        ...b,
        status: 'cancelled' as const
      } :
      b
      )
      );
      // Refund
      setWalletBalance((prev) => prev + booking.price);
      const refundTransaction: Transaction = {
        id: `t-${Date.now()}`,
        type: 'refund',
        title: `Refund - ${booking.service}`,
        date: 'Just now',
        amount: booking.price,
        status: 'completed'
      };
      setTransactions((prev) => [refundTransaction, ...prev]);
      notify.info('Booking cancelled. Refund added to wallet.');
      void bookingApi.updateBookingStatus(id, 'CANCELLED', 'customer');
    }
  };
  const addFunds = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
    const newTransaction: Transaction = {
      id: `t-${Date.now()}`,
      type: 'topup',
      title: 'Wallet Top-up',
      date: 'Just now',
      amount: amount,
      status: 'completed'
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    notify.success(`${formatCurrency(amount)} added to your wallet!`);
    const session = getActiveSession();
    if (session?.payload.role === 'customer') {
      void notificationApi.createNotification({
        role: 'customer',
        userId: session.payload.userId,
        title: 'Wallet top-up',
        message: `${formatCurrency(amount)} was added to your wallet.`,
        type: 'success'
      });
    }
  };
  const deductFunds = (amount: number): boolean => {
    if (walletBalance >= amount) {
      setWalletBalance((prev) => prev - amount);
      return true;
    }
    notify.error('Insufficient wallet balance');
    return false;
  };
  return (
    <BookingContext.Provider
      value={{
        bookings,
        activeBookings,
        completedBookings,
        addBooking,
        updateBookingStatus,
        cancelBooking,
        walletBalance,
        addFunds,
        deductFunds,
        transactions
      }}>

      {children}
    </BookingContext.Provider>);

};