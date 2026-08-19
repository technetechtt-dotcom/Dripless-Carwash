import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon, CreditCardIcon, MapPinIcon, ReceiptIcon } from 'lucide-react';
import type { Booking } from '../contexts/BookingContext';
import { formatCurrency, formatPoints } from '../utils/currency';
import { ROUTES } from '../utils/routes';

const ServiceDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = (location.state as { service?: Booking } | null)?.service;
  if (!booking) return <main className="min-h-screen p-6 flex items-center justify-center"><div className="glass-card p-6 text-center"><h1 className="text-xl font-bold dark:text-white">Booking details unavailable</h1><button className="btn-primary mt-4 px-5 py-3" onClick={() => navigate(ROUTES.SERVICE_HISTORY)}>View bookings</button></div></main>;

  return <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">
    <header className="glass-nav sticky top-0 z-20 p-4 flex items-center"><button onClick={() => navigate(-1)} className="mr-3" aria-label="Go back"><ArrowLeftIcon /></button><h1 className="text-xl font-bold dark:text-white">Booking details</h1></header>
    <section className="p-4 max-w-xl mx-auto space-y-4">
      <article className="glass-card p-6 dark:bg-slate-800/90">
        <div className="flex justify-between gap-4"><div><p className="text-xs font-mono text-slate-500">{booking.id}</p><h2 className="text-xl font-bold dark:text-white mt-1">{booking.service}</h2><p className="text-sm text-slate-500">{booking.option}</p></div><div className="text-right"><strong className="text-xl dark:text-white">{formatCurrency(booking.price)}</strong><p className="text-xs font-bold capitalize text-eco-600 mt-1">{booking.status}</p></div></div>
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700 space-y-3 text-sm text-slate-600 dark:text-slate-300"><p className="flex gap-3"><CalendarIcon size={17} />{booking.date} at {booking.time}</p><p className="flex gap-3"><MapPinIcon size={17} />{booking.location}</p><p className="flex gap-3"><CreditCardIcon size={17} />{booking.paymentMethod === 'wallet' ? 'Dripless Wallet' : 'Paystack'}</p></div>
      </article>
      <div className="glass-card p-5 dark:bg-slate-800/90 flex justify-between"><span className="text-slate-500">EcoPoints awarded on completion</span><strong className="text-eco-600">{formatPoints(booking.ecoPoints)}</strong></div>
      {booking.status === 'completed' ? <button onClick={() => navigate(ROUTES.RECEIPTS)} className="btn-primary w-full py-3 flex items-center justify-center gap-2"><ReceiptIcon size={18} />Open receipts</button> : null}
      {['pending', 'confirmed', 'in-progress'].includes(booking.status) ? <button onClick={() => navigate(ROUTES.TRACKING, { state: { bookingId: booking.id } })} className="btn-primary w-full py-3">Track booking</button> : null}
    </section>
  </main>;
};

export default ServiceDetails;
