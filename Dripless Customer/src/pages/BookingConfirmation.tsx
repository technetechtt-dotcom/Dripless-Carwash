import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircleIcon, ArrowRightIcon, CalendarIcon, CreditCardIcon, Loader2Icon, MapPinIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { paymentsApi } from '@shared/api';
import { useBookings, type Booking } from '../contexts/BookingContext';
import { formatCurrency } from '../utils/currency';
import { ROUTES } from '../utils/routes';

type BookingInput = Omit<Booking, 'id' | 'status' | 'ecoPoints' | 'createdAt'>;
type BookingDetails = Partial<BookingInput> & {
  appliedSpecial?: { promoCode?: string } | null;
};

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addBooking } = useBookings();
  const details = (location.state as { bookingDetails?: BookingDetails } | null)?.bookingDetails;
  const started = useRef(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [phase, setPhase] = useState<'creating' | 'payment' | 'paid' | 'error'>('creating');
  const [error, setError] = useState('');

  const createInput = useCallback((): BookingInput => {
    if (!details?.service || !details.option || !details.location) {
      throw new Error('Booking details are missing. Please start the booking again.');
    }
    return {
      service: details.service,
      option: details.option,
      price: Number(details.price || 0),
      basePrice: details.basePrice,
      specialDiscountAmount: details.specialDiscountAmount,
      appliedSpecialPromoCode: details.appliedSpecialPromoCode ?? details.appliedSpecial?.promoCode ?? null,
      date: details.date || new Date().toISOString().slice(0, 10),
      time: details.time || 'ASAP',
      location: details.location,
      pickupCoordinates: details.pickupCoordinates ?? null,
      destinationLocation: details.destinationLocation ?? null,
      destinationCoordinates: details.destinationCoordinates ?? null,
      paymentMethod: details.paymentMethod === 'wallet' ? 'wallet' : 'paystack'
    };
  }, [details]);

  const beginPayment = useCallback(async (existing?: Booking | null) => {
    setError('');
    try {
      const current = existing || booking || await addBooking(createInput());
      setBooking(current);
      setPhase('payment');
      const provider = current.paymentMethod === 'wallet' ? 'wallet' : 'paystack';
      const payment = await paymentsApi.createIntent(current.id, provider);
      if (payment.status === 'PAID') {
        setPhase('paid');
        return;
      }
      if (!payment.checkoutUrl) throw new Error('The payment provider did not return a checkout link.');
      localStorage.setItem('dripless_pending_payment', JSON.stringify({
        paymentId: payment.paymentId,
        bookingId: current.id,
        createdAt: new Date().toISOString()
      }));
      window.location.assign(payment.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the booking payment.');
      setPhase('error');
    }
  }, [addBooking, booking, createInput]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void beginPayment(null);
  }, [beginPayment]);

  const input = (() => {
    try { return createInput(); } catch { return null; }
  })();

  return (
    <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 px-5 py-10">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto space-y-5">
        <div className="glass-card p-7 text-center dark:bg-slate-800/90">
          {phase === 'error' ? <AlertCircleIcon size={52} className="mx-auto text-red-500 mb-4" /> : <Loader2Icon size={52} className={phase === 'paid' ? 'mx-auto text-eco-600 mb-4' : 'mx-auto text-eco-600 mb-4 animate-spin'} />}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {phase === 'creating' ? 'Creating your booking' : phase === 'payment' ? 'Opening secure payment' : phase === 'paid' ? 'Booking paid' : 'Action needed'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {phase === 'paid' ? 'Your wallet payment was verified by the server.' : phase === 'error' ? error : 'Please keep this page open while we prepare the next step.'}
          </p>
        </div>

        {input ? <div className="glass-card p-5 dark:bg-slate-800/90 space-y-3">
          <div className="flex justify-between gap-4"><span className="font-bold text-slate-800 dark:text-white">{input.service} · {input.option}</span><strong className="dark:text-white">{formatCurrency(input.price)}</strong></div>
          <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><CalendarIcon size={17} />{input.date} at {input.time}</div>
          <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><MapPinIcon size={17} />{input.location}</div>
          <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><CreditCardIcon size={17} />{input.paymentMethod === 'wallet' ? 'Dripless Wallet' : 'Paystack hosted checkout'}</div>
        </div> : null}

        {phase === 'error' ? <div className="grid grid-cols-2 gap-3">
          <button className="py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold" onClick={() => navigate(ROUTES.SERVICES)}>Start over</button>
          <button className="btn-primary py-3 font-bold" onClick={() => void beginPayment(booking)}>Try again</button>
        </div> : null}

        {phase === 'paid' && booking ? <button className="btn-primary w-full py-3 flex items-center justify-center gap-2" onClick={() => navigate(ROUTES.TRACKING, { state: { bookingId: booking.id } })}>Track booking <ArrowRightIcon size={18} /></button> : null}
      </motion.section>
    </main>
  );
};

export default BookingConfirmation;
