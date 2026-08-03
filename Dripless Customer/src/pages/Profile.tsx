import React, { Children } from 'react';
import {
  UserIcon,
  CreditCardIcon,
  BellIcon,
  HelpCircleIcon,
  LogOutIcon,
  ChevronRightIcon,
  HomeIcon,
  CarIcon,
  MoonIcon,
  SunIcon,
  ShieldIcon,
  FileTextIcon,
  MessageSquareIcon,
  TicketIcon,
  GiftIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useBookings } from '../contexts/BookingContext';
import { useTheme } from '../contexts/ThemeContext';
import { ROUTES } from '../utils/routes';
import { formatCurrency } from '../utils/currency';
const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { walletBalance } = useBookings();
  const { isDark, toggleTheme } = useTheme();
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen pb-24">

      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-eco-500 to-teal-700 pt-12 pb-20 px-6 text-white rounded-b-[2.5rem] shadow-lg relative overflow-hidden">

        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-900/20 rounded-full -ml-10 -mb-10 blur-xl"></div>

        <div className="relative z-10 flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold">Profile</h1>
          <motion.button
            whileTap={{
              scale: 0.9
            }}
            onClick={toggleTheme}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors">

            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </motion.button>
        </div>

        <div className="relative z-10 flex items-center">
          <div className="bg-white/20 backdrop-blur-md p-1 rounded-full mr-4 border border-white/30">
            <div className="bg-white p-3 rounded-full">
              <UserIcon size={32} className="text-eco-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.name || 'Guest'}</h2>
            <p className="text-eco-100 font-medium">
              {user?.email || 'guest@example.com'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 -mt-12 relative z-20 space-y-6">
        {/* Eco Wallet */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-5 dark:bg-slate-800/90">

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              Eco Wallet
            </h3>
            <button
              onClick={() => navigate(ROUTES.WALLET)}
              className="text-eco-600 dark:text-eco-400 text-sm font-bold">

              Manage
            </button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
                Available Balance
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => navigate(ROUTES.WALLET)}
              className="btn-primary px-5 py-2.5 text-sm">

              Add Funds
            </motion.button>
          </div>
        </motion.div>

        {/* Service History */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-5 dark:bg-slate-800/90">

          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">
            Recent Services
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="bg-eco-100 dark:bg-eco-900/30 p-2.5 rounded-xl mr-4">
                <CarIcon size={18} className="text-eco-600 dark:text-eco-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Car Wash
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yesterday, 3:30 PM
                </p>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(24.99)}
              </span>
            </div>
            <div className="flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl mr-4">
                <HomeIcon
                  size={18}
                  className="text-blue-600 dark:text-blue-400" />

              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Window Cleaning
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  May 5, 2:00 PM
                </p>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(39.99)}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(ROUTES.SERVICE_HISTORY)}
            className="w-full text-eco-600 dark:text-eco-400 text-sm font-bold mt-4 py-2 hover:bg-eco-50 dark:hover:bg-eco-900/20 rounded-lg transition-colors">

            View All History
          </button>
        </motion.div>

        {/* My Cars */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-2 dark:bg-slate-800/90">

          <div className="space-y-1">
            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.MY_CARS)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg mr-3">
                  <CarIcon
                    size={18}
                    className="text-teal-600 dark:text-teal-400" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  My Cars
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Account Settings */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-2 dark:bg-slate-800/90">

          <div className="space-y-1">
            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.PERSONAL_INFORMATION)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg mr-3">
                  <UserIcon
                    size={18}
                    className="text-slate-600 dark:text-slate-300" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Personal Information
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.PAYMENT_METHODS)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg mr-3">
                  <CreditCardIcon
                    size={18}
                    className="text-slate-600 dark:text-slate-300" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Payment Methods
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg mr-3">
                  <BellIcon
                    size={18}
                    className="text-slate-600 dark:text-slate-300" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Notifications
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Legal & Feedback */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-2 dark:bg-slate-800/90">

          <div className="space-y-1">
            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.PRIVACY_POLICY)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mr-3">
                  <ShieldIcon
                    size={18}
                    className="text-blue-600 dark:text-blue-400" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Privacy Policy
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.TERMS_CONDITIONS)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mr-3">
                  <FileTextIcon
                    size={18}
                    className="text-blue-600 dark:text-blue-400" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Terms & Conditions
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.FEEDBACK)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mr-3">
                  <MessageSquareIcon
                    size={18}
                    className="text-amber-600 dark:text-amber-400" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Feedback & Bug Report
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>

            <motion.button
              whileTap={{
                scale: 0.98
              }}
              onClick={() => navigate(ROUTES.HELP_SUPPORT)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg mr-3">
                  <HelpCircleIcon
                    size={18}
                    className="text-slate-600 dark:text-slate-300" />

                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Help & Support
                </span>
              </div>
              <ChevronRightIcon size={18} className="text-slate-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-2 dark:bg-slate-800/90">

          <motion.button
            whileTap={{
              scale: 0.98
            }}
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500 dark:text-red-400">

            <div className="flex items-center">
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg mr-3">
                <LogOutIcon
                  size={18}
                  className="text-red-500 dark:text-red-400" />

              </div>
              <span className="text-sm font-medium">Log Out</span>
            </div>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>);

};
export default Profile;