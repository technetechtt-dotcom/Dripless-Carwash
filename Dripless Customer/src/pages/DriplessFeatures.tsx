import React, { useState, Children, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DiscIcon,
  BellIcon,
  MessageSquareIcon,
  CalendarIcon,
  ClockIcon,
  BarChart3Icon,
  PlayCircleIcon,
  ChevronRightIcon,
  StarIcon,
  CheckCircleIcon,
  CarIcon,
  SparklesIcon,
  AlertCircleIcon,
  XIcon,
  TicketIcon,
  GiftIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookings } from '../contexts/BookingContext';
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
// Demo slides data
const demoSlides = [
{
  id: 1,
  title: 'Waterless Technology',
  description:
  'Our dripless formula cleans without a single drop of water waste',
  gradient: 'from-eco-500 to-teal-600',
  icon: SparklesIcon
},
{
  id: 2,
  title: 'Eco-Certified Products',
  description: '100% biodegradable, chemical-free cleaning solutions',
  gradient: 'from-teal-500 to-cyan-600',
  icon: CheckCircleIcon
},
{
  id: 3,
  title: 'Mobile Service',
  description: 'We come to you — home, office, or anywhere you park',
  gradient: 'from-cyan-500 to-blue-600',
  icon: CarIcon
},
{
  id: 4,
  title: 'Membership Perks',
  description: 'Save up to 40% with our Dripless Disc membership program',
  gradient: 'from-blue-500 to-indigo-600',
  icon: DiscIcon
}];

// Mock feedback data
const recentFeedback = [
{
  id: 1,
  customer: 'Sarah M.',
  rating: 5,
  comment: 'Spotless finish, love the eco approach!',
  date: '2 hours ago'
},
{
  id: 2,
  customer: 'James K.',
  rating: 4,
  comment: 'Great service, very convenient.',
  date: 'Yesterday'
},
{
  id: 3,
  customer: 'Priya R.',
  rating: 5,
  comment: "Best waterless wash I've tried.",
  date: '2 days ago'
}];

const DriplessFeatures = () => {
  const navigate = useNavigate();
  const { activeBookings, completedBookings, bookings } = useBookings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [discReminderEnabled, setDiscReminderEnabled] = useState(true);
  const [washReminderEnabled, setWashReminderEnabled] = useState(true);
  const [washReminderDays, setWashReminderDays] = useState(14);
  // Wash report stats
  const totalWashes = completedBookings.length + 3; // mock extra
  const totalSpent =
  completedBookings.reduce((sum, b) => sum + b.price, 0) + 89.97;
  const avgRating = 4.7;
  const waterSaved = totalWashes * 150;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

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
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Dripless Carwash
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your wash hub
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Demo Wash Slides */}
        <motion.div variants={item}>
          <div className="relative overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{
                  opacity: 0,
                  x: 50
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  x: -50
                }}
                transition={{
                  duration: 0.3
                }}
                className={`bg-gradient-to-br ${demoSlides[currentSlide].gradient} p-6 rounded-2xl text-white min-h-[160px] flex flex-col justify-between`}>

                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                      {currentSlide + 1} / {demoSlides.length}
                    </p>
                    <h3 className="text-xl font-bold mb-2">
                      {demoSlides[currentSlide].title}
                    </h3>
                    <p className="text-sm text-white/80">
                      {demoSlides[currentSlide].description}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    {createElement(demoSlides[currentSlide].icon, {
                      size: 28
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide dots */}
            <div className="flex justify-center gap-2 mt-3">
              {demoSlides.map((_, idx) =>
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'w-6 bg-eco-500' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} />

              )}
            </div>
          </div>
        </motion.div>

        {/* Active Bookings */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Active Bookings
            </h2>
            <span className="bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeBookings.length}
            </span>
          </div>

          {activeBookings.length > 0 ?
          activeBookings.map((booking) =>
          <div
            key={booking.id}
            className="glass-card p-4 border-l-4 border-l-amber-500">

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="bg-eco-100 dark:bg-eco-900/30 p-2.5 rounded-xl mr-3">
                      <CarIcon
                    size={18}
                    className="text-eco-600 dark:text-eco-400" />

                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {booking.service} — {booking.option}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {booking.date}, {booking.time}
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    {booking.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Progress</span>
                    <span>65%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                  initial={{
                    width: 0
                  }}
                  animate={{
                    width: '65%'
                  }}
                  transition={{
                    duration: 1.5,
                    ease: 'easeOut'
                  }}
                  className="h-full bg-gradient-to-r from-eco-400 to-eco-600 rounded-full" />

                  </div>
                </div>
              </div>
          ) :

          <div className="glass-card p-6 text-center">
              <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarIcon size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active bookings
              </p>
              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => navigate('/booking/car-wash')}
              className="btn-primary px-6 py-2.5 text-sm mt-3">

                Book a Wash
              </motion.button>
            </div>
          }
        </motion.div>

        {/* Wash Bookings */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Wash Bookings
            </h2>
            <button
              onClick={() => navigate('/service-history')}
              className="text-eco-600 dark:text-eco-400 text-sm font-medium">

              View All
            </button>
          </div>

          <div className="glass-card divide-y divide-slate-100 dark:divide-slate-700/50">
            {bookings.slice(0, 3).map((booking) =>
            <div
              key={booking.id}
              className="p-4 flex items-center justify-between">

                <div className="flex items-center">
                  <div
                  className={`p-2 rounded-lg mr-3 ${booking.status === 'completed' ? 'bg-eco-100 dark:bg-eco-900/30' : booking.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>

                    <CarIcon
                    size={16}
                    className={
                    booking.status === 'completed' ?
                    'text-eco-600 dark:text-eco-400' :
                    booking.status === 'cancelled' ?
                    'text-red-500' :
                    'text-amber-600 dark:text-amber-400'
                    } />

                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {booking.service}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {booking.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-800 dark:text-white">
                    ${booking.price.toFixed(2)}
                  </p>
                  <p
                  className={`text-[10px] font-bold uppercase ${booking.status === 'completed' ? 'text-eco-600' : booking.status === 'cancelled' ? 'text-red-500' : 'text-amber-600'}`}>

                    {booking.status}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Wash Report */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1">
            Wash Report
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <div className="bg-eco-100 dark:bg-eco-900/30 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <BarChart3Icon
                  size={18}
                  className="text-eco-600 dark:text-eco-400" />

              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {totalWashes}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Washes
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <StarIcon
                  size={18}
                  className="text-blue-600 dark:text-blue-400" />

              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {avgRating}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Avg Rating
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="bg-teal-100 dark:bg-teal-900/30 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <SparklesIcon
                  size={18}
                  className="text-teal-600 dark:text-teal-400" />

              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {waterSaved}L
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Water Saved
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <CalendarIcon
                  size={18}
                  className="text-purple-600 dark:text-purple-400" />

              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                ${totalSpent.toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Spent
              </p>
            </div>
          </div>
        </motion.div>

        {/* Reminders */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1">
            Reminders
          </h2>

          <motion.div
            whileTap={{
              scale: 0.98
            }}
            className="glass-card p-4 cursor-pointer"
            onClick={() => setShowReminderModal(true)}>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl mr-3">
                  <DiscIcon
                    size={18}
                    className="text-amber-600 dark:text-amber-400" />

                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Disc Reminder
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {discReminderEnabled ?
                    'Active — renews in 12 days' :
                    'Disabled'}
                  </p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${discReminderEnabled ? 'bg-eco-500' : 'bg-slate-300 dark:bg-slate-600'}`}>

                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${discReminderEnabled ? 'translate-x-4' : 'translate-x-0'}`} />

              </div>
            </div>
          </motion.div>

          <motion.div
            whileTap={{
              scale: 0.98
            }}
            className="glass-card p-4 cursor-pointer"
            onClick={() => setShowReminderModal(true)}>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl mr-3">
                  <BellIcon
                    size={18}
                    className="text-blue-600 dark:text-blue-400" />

                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Wash Reminder
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {washReminderEnabled ?
                    `Every ${washReminderDays} days — next in 5 days` :
                    'Disabled'}
                  </p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${washReminderEnabled ? 'bg-eco-500' : 'bg-slate-300 dark:bg-slate-600'}`}>

                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${washReminderEnabled ? 'translate-x-4' : 'translate-x-0'}`} />

              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Vouchers & Gifts */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1">
            Vouchers & Gifts
          </h2>
          <motion.div
            whileTap={{
              scale: 0.98
            }}
            className="glass-card p-4 cursor-pointer"
            onClick={() => navigate('/vouchers')}>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl mr-3">
                  <TicketIcon
                    size={18}
                    className="text-purple-600 dark:text-purple-400" />

                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Redeem Voucher
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter a code to claim your reward
                  </p>
                </div>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </div>
          </motion.div>

          <motion.div
            whileTap={{
              scale: 0.98
            }}
            className="glass-card p-4 cursor-pointer"
            onClick={() => navigate('/vouchers')}>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-pink-100 dark:bg-pink-900/30 p-2.5 rounded-xl mr-3">
                  <GiftIcon
                    size={18}
                    className="text-pink-600 dark:text-pink-400" />

                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Send a Gift
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Treat someone to a Dripless wash
                  </p>
                </div>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </div>
          </motion.div>
        </motion.div>

        {/* Customer Feedback */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Customer Feedback
            </h2>
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => setShowFeedbackModal(true)}
              className="text-eco-600 dark:text-eco-400 text-sm font-bold">

              + Leave Review
            </motion.button>
          </div>

          <div className="space-y-3">
            {recentFeedback.map((fb) =>
            <div key={fb.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {fb.customer}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {fb.date}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) =>
                  <StarIcon
                    key={i}
                    size={12}
                    className={
                    i < fb.rating ?
                    'text-amber-400 fill-amber-400' :
                    'text-slate-300 dark:text-slate-600'
                    } />

                  )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {fb.comment}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() => navigate('/booking/car-wash')}
            className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-eco-500/20">

            Book a Dripless Wash
          </motion.button>
        </motion.div>
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal &&
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowFeedbackModal(false)} />

            <motion.div
            initial={{
              y: '100%'
            }}
            animate={{
              y: 0
            }}
            exit={{
              y: '100%'
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Leave Feedback
                </h2>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => setShowFeedbackModal(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={20} className="text-slate-500" />
                </motion.button>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  How was your last wash?
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) =>
                <motion.button
                  key={star}
                  whileTap={{
                    scale: 0.85
                  }}
                  onClick={() => setFeedbackRating(star)}
                  className="p-1">

                      <StarIcon
                    size={32}
                    className={`transition-colors ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />

                    </motion.button>
                )}
                </div>
              </div>

              <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Tell us about your experience..."
              className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 resize-none h-24 mb-4" />


              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => {
                setShowFeedbackModal(false);
                setFeedbackRating(0);
                setFeedbackComment('');
              }}
              className="btn-primary w-full py-4 font-bold">

                Submit Feedback
              </motion.button>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* Reminder Settings Modal */}
      <AnimatePresence>
        {showReminderModal &&
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowReminderModal(false)} />

            <motion.div
            initial={{
              y: '100%'
            }}
            animate={{
              y: 0
            }}
            exit={{
              y: '100%'
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Reminder Settings
                </h2>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => setShowReminderModal(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={20} className="text-slate-500" />
                </motion.button>
              </div>

              <div className="space-y-5">
                {/* Disc Reminder */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center">
                    <DiscIcon size={20} className="text-amber-500 mr-3" />
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Disc Reminder
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Membership renewal alerts
                      </p>
                    </div>
                  </div>
                  <button
                  onClick={() => setDiscReminderEnabled(!discReminderEnabled)}
                  className={`w-12 h-7 rounded-full p-0.5 transition-colors ${discReminderEnabled ? 'bg-eco-500' : 'bg-slate-300 dark:bg-slate-600'}`}>

                    <div
                    className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${discReminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />

                  </button>
                </div>

                {/* Wash Reminder */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BellIcon size={20} className="text-blue-500 mr-3" />
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          Wash Reminder
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Scheduled wash notifications
                        </p>
                      </div>
                    </div>
                    <button
                    onClick={() =>
                    setWashReminderEnabled(!washReminderEnabled)
                    }
                    className={`w-12 h-7 rounded-full p-0.5 transition-colors ${washReminderEnabled ? 'bg-eco-500' : 'bg-slate-300 dark:bg-slate-600'}`}>

                      <div
                      className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${washReminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />

                    </button>
                  </div>

                  {washReminderEnabled &&
                <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Remind every
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[7, 14, 21, 30].map((days) =>
                    <button
                      key={days}
                      onClick={() => setWashReminderDays(days)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${washReminderDays === days ? 'bg-eco-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>

                            {days}d
                          </button>
                    )}
                      </div>
                    </div>
                }
                </div>
              </div>

              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => setShowReminderModal(false)}
              className="btn-primary w-full py-4 font-bold mt-6">

                Save Settings
              </motion.button>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default DriplessFeatures;