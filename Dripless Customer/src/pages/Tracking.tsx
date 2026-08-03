import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  PhoneIcon,
  MessageCircleIcon,
  StarIcon,
  MapPinIcon,
  CheckCircleIcon } from
'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EcoStats from '../components/EcoStats';
import RouteMapCard from '../components/RouteMapCard';
import { estimateDistanceKm, estimateEtaMinutes, textToGeoPoint } from '@shared/maps';
import { trackingApi } from '@shared/api';
import type { BookingTrackingSnapshot } from '@shared/types';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};
const item = {
  hidden: {
    opacity: 0,
    y: 16
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};
const Tracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = location.state?.bookingDetails || {};
  const trackingType = location.state?.trackingType === 'PARCEL' ? 'PARCEL' : 'SERVICE';
  const pickup = bookingDetails.location || '123 Green Street, Eco City';
  const destination =
  bookingDetails.destinationLocation || 'Green Park Mall, Eco City';
  const providedPickupPoint =
    bookingDetails.pickupCoordinates &&
    Number.isFinite(Number(bookingDetails.pickupCoordinates.lat)) &&
    Number.isFinite(Number(bookingDetails.pickupCoordinates.lng)) ?
    {
      lat: Number(bookingDetails.pickupCoordinates.lat),
      lng: Number(bookingDetails.pickupCoordinates.lng)
    } :
    null;
  const providedDestinationPoint =
    bookingDetails.destinationCoordinates &&
    Number.isFinite(Number(bookingDetails.destinationCoordinates.lat)) &&
    Number.isFinite(Number(bookingDetails.destinationCoordinates.lng)) ?
    {
      lat: Number(bookingDetails.destinationCoordinates.lat),
      lng: Number(bookingDetails.destinationCoordinates.lng)
    } :
    null;
  const bookingId =
    typeof bookingDetails.id === 'string' ? bookingDetails.id : undefined;
  const pickupPoint = useMemo(
    () => providedPickupPoint ?? textToGeoPoint(pickup, 11),
    [pickup, providedPickupPoint]
  );
  const destinationPoint = useMemo(
    () => providedDestinationPoint ?? textToGeoPoint(destination, 29),
    [destination, providedDestinationPoint]
  );
  const [snapshot, setSnapshot] = useState<BookingTrackingSnapshot | null>(null);
  const [progress, setProgress] = useState(0.22);
  useEffect(() => {
    if (!bookingId) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    const loadTracking = async () => {
      try {
        const data = await trackingApi.getBookingTracking(bookingId);
        if (!cancelled) {
          setSnapshot(data);
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
        }
      }
    };
    void loadTracking();
    const interval = window.setInterval(() => {
      void loadTracking();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [bookingId]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => (current >= 0.93 ? 0.93 : current + 0.07));
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);
  const pickupMapPoint = snapshot?.pickupCoordinates ?? pickupPoint;
  const destinationMapPoint = snapshot?.destinationCoordinates ?? destinationPoint;
  const liveDriverPoint = snapshot?.driverLocation ?
    {
      lat: snapshot.driverLocation.lat,
      lng: snapshot.driverLocation.lng
    } :
    null;
  const remainingKm = estimateDistanceKm(
    liveDriverPoint ?? {
      lat:
        pickupMapPoint.lat +
        (destinationMapPoint.lat - pickupMapPoint.lat) * progress,
      lng:
        pickupMapPoint.lng +
        (destinationMapPoint.lng - pickupMapPoint.lng) * progress
    },
    destinationMapPoint
  );
  const etaMinutes = estimateEtaMinutes(remainingKm);
  const isCompleted = progress >= 0.9;
  const provider = {
    name: 'Michael',
    surname: 'Green',
    role: 'Eco Wash Specialist',
    phone: '+27 82 456 7890',
    rating: 4.9,
    completedJobs: 847,
    vehicle: 'Toyota HiAce',
    vehicleColor: 'White',
    licensePlate: 'DRP 847 GP',
    vehicleType: 'Hybrid',
    image:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face'
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full glass">

          <ArrowLeftIcon
            size={20}
            className="text-slate-700 dark:text-slate-200" />

        </motion.button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Live Tracking
        </h1>
      </div>

      <div className="p-4 space-y-5">
        {/* Service Provider Card */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="relative mr-4">
                <img
                  src={provider.image}
                  alt={`${provider.name} ${provider.surname}`}
                  className="w-14 h-14 rounded-full object-cover border-2 border-eco-500" />

                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
                  <div className="bg-green-500 w-2.5 h-2.5 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {provider.name} {provider.surname}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {provider.role}
                </p>
                <div className="flex items-center mt-1">
                  <StarIcon
                    size={12}
                    className="text-amber-400 fill-amber-400 mr-1" />

                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {provider.rating}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({provider.completedJobs} jobs)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${provider.phone.replace(/\s/g, '')}`}
                className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">

                <PhoneIcon size={18} />
              </a>
              <button
                type="button"
                className="p-2.5 bg-eco-50 dark:bg-eco-900/30 text-eco-600 dark:text-eco-400 rounded-full hover:bg-eco-100 dark:hover:bg-eco-900/50 transition-colors"
                onClick={() => navigate('/help-support')}
                aria-label="Message provider">
                <MessageCircleIcon size={18} />
              </button>
            </div>
          </div>

          {/* Contact & Vehicle Details */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Phone
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {provider.phone}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-600/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Vehicle
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {provider.vehicleColor} {provider.vehicle}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-600/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                License Plate
              </span>
              <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600/50 px-2 py-0.5 rounded">
                {provider.licensePlate}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Service Info */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                {trackingType === 'PARCEL' ? 'Parcel Delivery' : 'Car Wash'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {trackingType === 'PARCEL' ?
                'Live courier route' :
                'Today, 2:30 PM • Waterless Wash'}
              </p>
            </div>
            <span className={`${isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'} text-xs font-bold px-2.5 py-1 rounded-full`}>
              {isCompleted ? 'Almost There' : 'In Progress'}
            </span>
          </div>
          <div className="flex items-center text-slate-600 dark:text-slate-300 text-sm">
            <MapPinIcon size={16} className="mr-2 text-eco-500" />
            {destination}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-2.5 text-slate-600 dark:text-slate-200">
              Remaining: {remainingKm.toFixed(1)} km
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-2.5 text-slate-600 dark:text-slate-200">
              ETA: {etaMinutes} min
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <RouteMapCard
            pickup={pickupMapPoint}
            destination={destinationMapPoint}
            pickupLabel={pickup}
            destinationLabel={destination}
            progress={progress}
            showDriverMarker
            driverPoint={liveDriverPoint}
          />
        </motion.div>

        {/* Progress Timeline */}
        <motion.div
          variants={item}
          className="glass-card p-6 dark:bg-slate-800/90">

          <h3 className="font-bold text-slate-800 dark:text-white mb-5">
            Service Progress
          </h3>
          <div className="space-y-6 relative">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700 -z-10" />

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-eco-500 flex items-center justify-center shadow-md shadow-eco-500/30">
                <CheckCircleIcon size={14} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  Booking Confirmed
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  2:15 PM
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-eco-500 flex items-center justify-center shadow-md shadow-eco-500/30">
                <CheckCircleIcon size={14} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  Cleaner En Route
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  2:20 PM
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className={`${isCompleted ? 'bg-emerald-500 shadow-emerald-500/30 ring-4 ring-emerald-100 dark:ring-emerald-900/20' : 'bg-amber-500 shadow-amber-500/30 ring-4 ring-amber-100 dark:ring-amber-900/20'} w-6 h-6 rounded-full flex items-center justify-center shadow-md`}>
                {isCompleted ? (
                  <CheckCircleIcon size={14} className="text-white" />
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  {trackingType === 'PARCEL' ? 'Parcel in transit' : 'Service in Progress'}
                </h4>
                <p className={`${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} text-xs font-medium`}>
                  {isCompleted ? 'Final approach to destination' : `Est. arrival in ${etaMinutes} min`}
                </p>
              </div>
            </div>

            <div className={`flex gap-4 ${isCompleted ? '' : 'opacity-50'}`}>
              <div className={`${isCompleted ? 'bg-eco-500 shadow-md shadow-eco-500/30' : 'bg-slate-200 dark:bg-slate-700'} w-6 h-6 rounded-full flex items-center justify-center`}>
                {isCompleted ? (
                  <CheckCircleIcon size={14} className="text-white" />
                ) : (
                  <div className="w-2 h-2 bg-white dark:bg-slate-500 rounded-full" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  {trackingType === 'PARCEL' ? 'Delivered' : 'Service Completed'}
                </h4>
                <p className={`text-xs ${isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isCompleted ? 'Marked complete on route map' : 'Pending'}
                </p>
              </div>
            </div>
          </div>

          {/* Rate Service Button (Mocking completion for demo) */}
          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() =>
            navigate('/rate-service', {
              state: {
                service: {
                  name: 'Car Wash',
                  date: 'Today'
                }
              }
            })
            }
            className="w-full mt-6 py-3 bg-eco-50 dark:bg-eco-900/20 text-eco-600 dark:text-eco-400 rounded-xl font-bold text-sm border border-eco-100 dark:border-eco-900/50 hover:bg-eco-100 dark:hover:bg-eco-900/30 transition-colors">

            Service Completed? Rate Now
          </motion.button>
        </motion.div>

        {/* Eco Impact */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <h3 className="font-bold text-slate-800 dark:text-white mb-4">
            Eco Impact
          </h3>
          <EcoStats />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
            By choosing a waterless car wash, you're helping to conserve water
            and reduce chemical runoff.
          </p>
        </motion.div>
      </div>
    </motion.div>);

};
export default Tracking;