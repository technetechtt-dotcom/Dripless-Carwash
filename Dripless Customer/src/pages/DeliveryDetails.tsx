import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  MessageCircleIcon,
  StarIcon,
  TruckIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import RouteMapCard from '../components/RouteMapCard';
import { textToGeoPoint } from '@shared/maps';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
const item = {
  hidden: {
    opacity: 0,
    y: 20
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
const DeliveryDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = location.state?.bookingDetails || {};
  const pickup = bookingDetails.location || '123 Elm Street';
  const destination = bookingDetails.destinationLocation || '456 Oak Avenue';
  const pickupPoint = useMemo(() => textToGeoPoint(pickup, 13), [pickup]);
  const destinationPoint = useMemo(
    () => textToGeoPoint(destination, 17),
    [destination]
  );
  const fareEstimate = bookingDetails.fareEstimate || {
    min: 8,
    max: 12
  };
  const courier = {
    name: 'Sarah',
    surname: 'Chen',
    role: 'Green Courier',
    phone: '+27 84 987 6543',
    vehicle: 'Electric Scooter',
    vehicleColor: 'White',
    licensePlate: 'DRP 562 GP',
    vehicleType: 'Electric',
    rating: 4.8,
    completedJobs: 562,
    image:
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face'
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
          Delivery Details
        </h1>
      </div>

      <div className="p-4 space-y-5">
        {/* Courier Card */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="relative mr-4">
                <img
                  src={courier.image}
                  alt={`${courier.name} ${courier.surname}`}
                  className="w-14 h-14 rounded-full object-cover border-2 border-eco-500" />

                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
                  <div className="bg-green-500 w-2.5 h-2.5 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {courier.name} {courier.surname}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {courier.role}
                </p>
                <div className="flex items-center mt-1">
                  <StarIcon
                    size={12}
                    className="text-amber-400 fill-amber-400 mr-1" />

                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {courier.rating}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({courier.completedJobs} deliveries)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${courier.phone.replace(/\s/g, '')}`}
                className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">

                <PhoneIcon size={18} />
              </a>
              <button
                type="button"
                className="p-2.5 bg-eco-50 dark:bg-eco-900/30 text-eco-600 dark:text-eco-400 rounded-full hover:bg-eco-100 dark:hover:bg-eco-900/50 transition-colors"
                onClick={() => navigate('/help-support')}
                aria-label="Message courier">
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
                {courier.phone}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-600/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Vehicle
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {courier.vehicleColor} {courier.vehicle}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-600/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                License Plate
              </span>
              <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600/50 px-2 py-0.5 rounded">
                {courier.licensePlate}
              </span>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-600/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Type
              </span>
              <span className="text-xs font-bold text-eco-600 dark:text-eco-400 bg-eco-50 dark:bg-eco-900/20 px-2 py-0.5 rounded">
                {courier.vehicleType}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Vehicle Info */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center justify-between dark:bg-slate-800/90">

          <div className="flex items-center">
            <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl mr-3">
              <TruckIcon
                size={20}
                className="text-slate-600 dark:text-slate-300" />

            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {courier.vehicle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zero Emissions
              </p>
            </div>
          </div>
          <span className="bg-eco-100 dark:bg-eco-900/30 text-xs font-bold px-2 py-1 rounded-lg text-eco-600 dark:text-eco-400">
            Electric
          </span>
        </motion.div>

        {/* Route Card */}
        <motion.div
          variants={item}
          className="glass-card p-6 dark:bg-slate-800/90 relative overflow-hidden">

          <div className="absolute left-[29px] top-10 bottom-10 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4 shadow-sm z-10 relative">
                <div className="w-3 h-3 bg-blue-500 rounded-full ring-2 ring-white dark:ring-slate-800" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Pickup
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  {pickup}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-eco-100 dark:bg-eco-900/30 flex items-center justify-center mr-4 shadow-sm z-10 relative">
                <MapPinIcon
                  size={16}
                  className="text-eco-600 dark:text-eco-400" />

              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Delivery To
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  {destination}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <RouteMapCard
            pickup={pickupPoint}
            destination={destinationPoint}
            pickupLabel={pickup}
            destinationLabel={destination}
            progress={0.08}
          />
        </motion.div>

        {/* Package Details */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <h3 className="font-bold text-slate-800 dark:text-white mb-3">
            Package Details
          </h3>
          <div className="flex items-center">
            <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl mr-3">
              <PackageIcon
                size={20}
                className="text-slate-600 dark:text-slate-300" />

            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Standard Package
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Up to 5kg • No special handling
              </p>
            </div>
          </div>
        </motion.div>

        {/* Delivery Fee */}
        <motion.div
          variants={item}
          className="glass-card p-5 border-l-4 border-l-eco-500 dark:bg-slate-800/90">

          <h2 className="font-bold text-slate-800 dark:text-white mb-2">
            Delivery Fee
          </h2>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              ${fareEstimate.min} - ${fareEstimate.max}
            </p>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg mb-1">
              Estimated
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 pt-2">
          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() => navigate(-1)}
            className="py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

            Cancel
          </motion.button>
          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() =>
            navigate('/tracking', {
              state: {
                bookingDetails,
                trackingType: 'PARCEL'
              }
            })
            }
            className="btn-primary py-4 font-bold text-lg shadow-xl shadow-eco-500/20">

            Confirm Delivery
          </motion.button>
        </motion.div>
      </div>
    </motion.div>);

};
export default DeliveryDetails;