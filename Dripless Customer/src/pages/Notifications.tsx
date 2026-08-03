import React, { useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BellIcon,
  MailIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  CalendarIcon,
  WalletIcon,
  TagIcon,
  StarIcon,
  SettingsIcon,
  Trash2Icon,
  CheckCheckIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
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
const Notifications = () => {
  const navigate = useNavigate();
  // Mock Notifications Data
  const [notifications, setNotifications] = useState([
  {
    id: 1,
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Car Wash scheduled for today at 2:30 PM',
    time: '2 min ago',
    read: false,
    icon: CalendarIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    id: 2,
    type: 'points',
    title: 'EcoPoints Earned',
    message: 'You earned +250 points from your last wash!',
    time: '1 hour ago',
    read: false,
    icon: StarIcon,
    color: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30'
  },
  {
    id: 3,
    type: 'promo',
    title: 'Special Offer',
    message: 'Get 20% off your next window cleaning service.',
    time: '3 hours ago',
    read: false,
    icon: TagIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30'
  },
  {
    id: 4,
    type: 'wallet',
    title: 'Wallet Top-up',
    message: '$50.00 added to your Eco Wallet successfully.',
    time: 'Yesterday',
    read: true,
    icon: WalletIcon,
    color: 'text-eco-600',
    bg: 'bg-eco-100 dark:bg-eco-900/30'
  },
  {
    id: 5,
    type: 'service',
    title: 'Service Completed',
    message: 'Your Window Cleaning service has been completed.',
    time: 'Yesterday',
    read: true,
    icon: CheckCircleIcon,
    color: 'text-teal-500',
    bg: 'bg-teal-100 dark:bg-teal-900/30'
  },
  {
    id: 6,
    type: 'reminder',
    title: 'Wash Reminder',
    message: 'Your car is due for a wash based on your schedule.',
    time: '2 days ago',
    read: true,
    icon: BellIcon,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-700'
  },
  {
    id: 7,
    type: 'referral',
    title: 'Referral Bonus',
    message: 'You earned $10 for referring a friend!',
    time: '3 days ago',
    read: true,
    icon: WalletIcon,
    color: 'text-eco-600',
    bg: 'bg-eco-100 dark:bg-eco-900/30'
  },
  {
    id: 8,
    type: 'feature',
    title: 'New Feature',
    message: 'Vouchers & Gifts are now available in the app.',
    time: '1 week ago',
    read: true,
    icon: StarIcon,
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30'
  }]
  );
  // Settings State
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    bookingUpdates: true,
    promotionalOffers: true,
    ecoPointsUpdates: true,
    serviceReminders: true,
    paymentReceipts: true,
    newFeatures: false
  });
  const handleToggle = (key: keyof typeof settings) => {
    setSettings({
      ...settings,
      [key]: !settings[key]
    });
  };
  const markAllRead = () => {
    setNotifications(
      notifications.map((n) => ({
        ...n,
        read: true
      }))
    );
    toast.success('All notifications marked as read');
  };
  const clearAll = () => {
    setNotifications([]);
    toast.success('Notifications cleared');
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
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
            Notifications
          </h1>
        </div>
        {notifications.length > 0 &&
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={markAllRead}
          className="p-2 rounded-full glass text-eco-600 dark:text-eco-400"
          title="Mark all as read">

            <CheckCheckIcon size={20} />
          </motion.button>
        }
      </div>

      <div className="p-4 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key="feed"
            initial={{
              opacity: 0,
              x: -20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: 20
            }}
            className="space-y-3">

            {notifications.length === 0 ?
            <div className="glass-card p-8 text-center mt-10">
                <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellIcon size={28} className="text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  All caught up!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You have no new notifications.
                </p>
              </div> :

            notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 20
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  className={`glass-card p-4 flex items-start relative overflow-hidden ${!notification.read ? 'bg-white/90 dark:bg-slate-800/90 border-l-4 border-l-eco-500' : ''}`}>

                    <div
                    className={`${notification.bg} p-2.5 rounded-xl mr-3.5 flex-shrink-0`}>

                      <Icon size={18} className={notification.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3
                        className={`text-sm font-bold truncate pr-2 ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>

                          {notification.title}
                        </h3>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {notification.time}
                        </span>
                      </div>
                      <p
                      className={`text-xs leading-relaxed ${!notification.read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>

                        {notification.message}
                      </p>
                    </div>
                    {!notification.read &&
                  <div className="absolute top-4 right-4 w-2 h-2 bg-eco-500 rounded-full" />
                  }
                  </motion.div>);

            })
            }

            {notifications.length > 0 &&
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={clearAll}
              className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-2 mt-4">

                <Trash2Icon size={14} />
                Clear All Notifications
              </motion.button>
            }
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>);

};
export default Notifications;