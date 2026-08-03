import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircleIcon,
  HomeIcon,
  MapPinIcon,
  CalendarIcon,
  CreditCardIcon,
  SparklesIcon,
  LeafIcon,
  ArrowRightIcon,
  StarIcon,
  MessageCircleIcon,
  PhoneIcon,
  Share2Icon,
  LinkIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { notify } from '../utils/notify';
import { formatCurrency, formatPoints } from '../utils/currency';
import { ROUTES } from '../utils/routes';
import { useBookings } from '../contexts/BookingContext';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
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
const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addBooking } = useBookings();
  const hasPersistedBooking = useRef(false);
  const bookingDetails = location.state?.bookingDetails || {};
  const handleShare = () => {
    const shareUrl = `https://dripless.app/booking/${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(shareUrl);
    notify.success('Booking link copied to clipboard!');
  };
  // Determine provider based on service type
  const getProvider = () => {
    const service = bookingDetails.service?.toLowerCase() || '';
    if (service.includes('taxi') || service.includes('ride')) {
      return {
        name: 'Alex',
        surname: 'Johnson',
        role: 'Eco Driver',
        phone: '+27 83 123 4567',
        rating: 4.9,
        completedJobs: 1203,
        vehicle: 'Toyota Camry',
        vehicleColor: 'Silver Sedan',
        licensePlate: 'ECO 120 GP',
        vehicleType: 'Hybrid',
        image:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'
      };
    } else if (service.includes('delivery')) {
      return {
        name: 'Sarah',
        surname: 'Chen',
        role: 'Green Courier',
        phone: '+27 84 987 6543',
        rating: 4.8,
        completedJobs: 562,
        vehicle: 'Electric Scooter',
        vehicleColor: 'White',
        licensePlate: 'DRP 562 GP',
        vehicleType: 'Electric',
        image:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face'
      };
    } else {
      return {
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
    }
  };
  const provider = getProvider();
  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0
    };
    const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;
    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      // Eco-themed confetti colors
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ffffff'];
      confetti({
        ...defaults,
        particleCount,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        },
        colors
      });
      confetti({
        ...defaults,
        particleCount,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        },
        colors
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasPersistedBooking.current) return;
    if (!bookingDetails?.service || !bookingDetails?.option) return;
    hasPersistedBooking.current = true;
    addBooking({
      service: bookingDetails.service,
      option: bookingDetails.option,
      price: bookingDetails.price || 0,
      basePrice: bookingDetails.basePrice,
      specialDiscountAmount: bookingDetails.specialDiscountAmount,
      appliedSpecialPromoCode: bookingDetails.appliedSpecial?.promoCode ?? null,
      date: bookingDetails.date || 'Today',
      time: bookingDetails.time || 'Now',
      location: bookingDetails.location || 'Your location',
      pickupCoordinates: bookingDetails.pickupCoordinates || null,
      destinationLocation: bookingDetails.destinationLocation || null,
      destinationCoordinates: bookingDetails.destinationCoordinates || null,
      paymentMethod: bookingDetails.paymentMethod || 'Visa •••• 4242'
    });
  }, [addBooking, bookingDetails]);
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <div className="bg-gradient-to-br from-eco-500 to-teal-600 pt-12 pb-24 px-6 text-white relative overflow-hidden rounded-b-[2.5rem] shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-900/20 rounded-full -ml-10 -mb-10 blur-xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{
              scale: 0
            }}
            animate={{
              scale: 1
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.1
            }}
            className="bg-white text-eco-500 p-4 rounded-full shadow-xl mb-4">

            <CheckCircleIcon size={48} strokeWidth={2.5} />
          </motion.div>
          <motion.h1 variants={item} className="text-3xl font-bold mb-2">
            Booking Confirmed!
          </motion.h1>
          <motion.p variants={item} className="text-eco-100 font-medium">
            Your service has been scheduled successfully.
          </motion.p>
        </div>
      </div>

      <div className="px-6 -mt-16 relative z-20 space-y-6">
        {/* Eco Points Earned */}
        <motion.div
          variants={item}
          className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-1 shadow-lg">

          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3">
                <SparklesIcon
                  size={20}
                  className="text-amber-500 fill-amber-500" />

              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  You Earned
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  +{formatPoints(Math.round((bookingDetails.price || 0) * 10))}{' '}
                  EcoPoints
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                Level Up Soon!
              </span>
            </div>
          </div>
        </motion.div>

        {/* Booking Summary */}
        <motion.div
          variants={item}
          className="glass-card p-6 dark:bg-slate-800/90">

          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center">
            Booking Summary
          </h2>

          <div className="space-y-5">
            <div className="flex items-start">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-2.5 rounded-xl mr-4 flex-shrink-0">
                <div className="text-teal-600 dark:text-teal-400">
                  {bookingDetails.serviceIcon || <HomeIcon size={20} />}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Service
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {bookingDetails.service || 'Service'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {bookingDetails.option}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl mr-4 flex-shrink-0">
                <MapPinIcon
                  size={20}
                  className="text-blue-600 dark:text-blue-400" />

              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Location
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {bookingDetails.location || 'Your location'}
                </p>
                {bookingDetails.destinationLocation &&
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    To: {bookingDetails.destinationLocation}
                  </p>
                }
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl mr-4 flex-shrink-0">
                <CalendarIcon
                  size={20}
                  className="text-purple-600 dark:text-purple-400" />

              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Date & Time
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {bookingDetails.date || 'Today'} at{' '}
                  {bookingDetails.time || 'Now'}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl mr-4 flex-shrink-0">
                <CreditCardIcon
                  size={20}
                  className="text-slate-600 dark:text-slate-400" />

              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                  Payment
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {bookingDetails.paymentMethod || 'Visa •••• 4242'}
                </p>
                {bookingDetails.appliedSpecial ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Special applied: {bookingDetails.appliedSpecial.promoCode}
                  </p>
                ) : null}
                {bookingDetails.specialDiscountAmount > 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Base {formatCurrency(bookingDetails.basePrice || bookingDetails.price || 0)} - Discount{' '}
                    {formatCurrency(bookingDetails.specialDiscountAmount || 0)}
                  </p>
                ) : null}
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(bookingDetails.price || 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Service Provider Card */}
        <motion.div
          variants={item}
          className="glass-card p-5 dark:bg-slate-800/90">

          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-sm uppercase tracking-wide">
            Your Service Provider
          </h2>
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
                onClick={() => navigate(ROUTES.HELP_SUPPORT)}
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

        {/* Impact Note */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center border-l-4 border-l-eco-500 dark:bg-slate-800/90">

          <div className="bg-eco-100 dark:bg-eco-900/30 p-2 rounded-lg mr-3">
            <LeafIcon size={18} className="text-eco-600 dark:text-eco-400" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            You've saved approx. 150L of water with this booking!
          </p>
        </motion.div>

        {/* Share Booking */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center justify-between dark:bg-slate-800/90">

          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
              <Share2Icon
                size={18}
                className="text-blue-600 dark:text-blue-400" />

            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Share Booking
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Copy a link to this booking
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{
              scale: 0.9
            }}
            onClick={() => {
              const bookingId = Math.random().toString(36).substring(2, 8);
              navigator.clipboard.writeText(
                `https://dripless.app/booking/${bookingId}`
              );
              notify.success('Booking link copied!');
            }}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">

            <LinkIcon
              size={16}
              className="text-slate-600 dark:text-slate-300" />

          </motion.button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={item} className="space-y-3 pt-2">
          <div className="grid grid-cols-4 gap-3">
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() =>
              navigate(ROUTES.TRACKING, {
                state: {
                  bookingDetails,
                  trackingType:
                    String(bookingDetails.service || '')
                      .toLowerCase()
                      .includes('delivery') ?
                    'PARCEL' :
                    'RIDE'
                }
              })
              }
              className="col-span-3 btn-primary py-4 font-bold flex items-center justify-center gap-2 shadow-xl shadow-eco-500/20">

              Track Your Service
              <ArrowRightIcon size={18} />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={handleShare}
              className="col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              aria-label="Share booking">

              <Share2Icon size={20} />
            </motion.button>
          </div>

          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() => navigate(ROUTES.HOME)}
            className="w-full py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

            Back to Home
          </motion.button>
        </motion.div>
      </div>
    </motion.div>);

};
export default BookingConfirmation;