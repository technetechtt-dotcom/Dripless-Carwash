import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, MapPinIcon, ShieldCheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { textToGeoPoint, type GeoPoint } from '@shared/maps';
import RouteMapCard from '../components/RouteMapCard';
import { formatCurrency } from '../utils/currency';
import { ROUTES } from '../utils/routes';

const RideDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = (location.state as { bookingDetails?: Record<string, unknown> } | null)?.bookingDetails;
  const pickup = String(bookingDetails?.location || 'Pickup not provided');
  const destination = String(bookingDetails?.destinationLocation || 'Destination not provided');
  const pickupPoint = useMemo(() => (bookingDetails?.pickupCoordinates as GeoPoint | null) || textToGeoPoint(pickup, 3), [bookingDetails, pickup]);
  const destinationPoint = useMemo(() => (bookingDetails?.destinationCoordinates as GeoPoint | null) || textToGeoPoint(destination, 5), [bookingDetails, destination]);

  return <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">
    <header className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
      <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full glass" aria-label="Go back"><ArrowLeftIcon size={20} /></button>
      <h1 className="text-xl font-bold dark:text-white">Review ride</h1>
    </header>
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-xl mx-auto space-y-5">
      <RouteMapCard pickup={pickupPoint} destination={destinationPoint} pickupLabel={pickup} destinationLabel={destination} progress={0} />
      <div className="glass-card p-5 dark:bg-slate-800/90 space-y-4">
        <div className="flex gap-3"><MapPinIcon className="text-eco-600 shrink-0" /><div><p className="text-xs text-slate-500">Pickup</p><p className="font-bold dark:text-white">{pickup}</p><p className="text-xs text-slate-500 mt-2">Destination</p><p className="font-bold dark:text-white">{destination}</p></div></div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between"><span className="text-slate-500">Quoted price</span><strong className="text-xl dark:text-white">{formatCurrency(Number(bookingDetails?.price || 0))}</strong></div>
      </div>
      <div className="glass-card p-4 flex gap-3 dark:bg-slate-800/90"><ShieldCheckIcon className="text-eco-600 shrink-0" /><p className="text-sm text-slate-600 dark:text-slate-300">A verified driver is assigned after the booking and payment are created. Driver details will appear in live tracking.</p></div>
      <div className="grid grid-cols-2 gap-3"><button onClick={() => navigate(-1)} className="py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold">Back</button><button onClick={() => navigate(ROUTES.BOOKING_CONFIRMATION, { state: { bookingDetails } })} className="btn-primary py-3 font-bold">Book and pay</button></div>
    </motion.section>
  </main>;
};

export default RideDetails;
