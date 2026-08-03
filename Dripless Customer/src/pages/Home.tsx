import React, { Children } from 'react';
import {
  CarIcon,
  SunIcon,
  PackageIcon,
  BellIcon,
  FlameIcon,
  TrendingUpIcon,
  SparklesIcon } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EcoStats from '../components/EcoStats';
import ServiceCard from '../components/ServiceCard';
import SmartRecommendations from '../components/SmartRecommendations';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/routes';
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
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen p-6 pb-24 space-y-8">

      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {getGreeting()}, <br />
            <span className="text-eco-600 dark:text-eco-400">
              {user?.name.split(' ')[0]}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Let's make today greener!
          </p>
        </div>
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          className="p-3 glass rounded-full relative hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">

          <BellIcon size={22} className="text-slate-600 dark:text-slate-300" />
          <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
        </motion.button>
      </motion.div>

      {/* Eco Streak */}
      <motion.div
        variants={item}
        className="flex items-center glass p-4 rounded-2xl border-l-4 border-l-orange-500 dark:bg-slate-900/40">

        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full mr-4">
          <FlameIcon
            size={20}
            className="text-orange-500 dark:text-orange-400 fill-orange-500" />

        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            5-day eco streak! 🔥
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep it up to earn a badge
          </p>
        </div>
        <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
          5 days
        </span>
      </motion.div>

      {/* Smart Recommendations */}
      <motion.div variants={item}>
        <SmartRecommendations />
      </motion.div>

      {/* Eco Impact Stats */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Your Impact
          </h2>
          <button
            onClick={() => navigate(ROUTES.REWARDS)}
            className="text-eco-600 dark:text-eco-400 text-sm font-medium hover:underline">

            View All
          </button>
        </div>
        <EcoStats />

        {/* Predictive Savings */}
        <div className="mt-4 glass p-4 rounded-2xl flex items-center border-l-4 border-l-eco-500 dark:bg-slate-900/40">
          <div className="bg-eco-100 dark:bg-eco-900/30 p-2 rounded-full mr-3">
            <TrendingUpIcon
              size={20}
              className="text-eco-600 dark:text-eco-400" />

          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Projected savings:{' '}
            <span className="font-bold text-eco-700 dark:text-eco-400">
              25kg CO₂
            </span>{' '}
            this year based on your habits.
          </p>
        </div>
      </motion.div>

      {/* Quick Services */}
      <motion.div variants={item} className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-1">
          Quick Services
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <ServiceCard
            title="Dripless Wash"
            description="Waterless & eco"
            icon={<SparklesIcon size={24} className="text-white" />}
            color="bg-gradient-to-br from-eco-400 to-eco-600"
            route="/booking/car-wash" />

          <ServiceCard
            title="Solar Clean"
            description="+15% efficiency"
            icon={<SunIcon size={24} className="text-white" />}
            color="bg-gradient-to-br from-blue-400 to-blue-600"
            route="/booking/window-solar-clean" />

          <ServiceCard
            title="Eco Taxi"
            description="Zero emission"
            icon={<CarIcon size={24} className="text-white" />}
            color="bg-gradient-to-br from-teal-400 to-teal-600"
            route="/booking/taxi" />

          <ServiceCard
            title="Delivery"
            description="Green routes"
            icon={<PackageIcon size={24} className="text-white" />}
            color="bg-gradient-to-br from-indigo-400 to-indigo-600"
            route="/booking/delivery" />

        </div>
      </motion.div>

      {/* Dripless Hub Banner */}
      <motion.div variants={item}>
        <motion.div
          whileTap={{
            scale: 0.98
          }}
          onClick={() => navigate(ROUTES.DRIPLESS_FEATURES)}
          className="glass-card p-5 cursor-pointer border-l-4 border-l-eco-500 flex items-center justify-between">

          <div className="flex items-center">
            <div className="bg-gradient-to-br from-eco-400 to-teal-600 p-3 rounded-xl mr-4 shadow-md">
              <SparklesIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Dripless Hub
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bookings, reports, reminders & feedback
              </p>
            </div>
          </div>
          <div className="bg-eco-100 dark:bg-eco-900/30 px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-eco-700 dark:text-eco-400">
              Open
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Active Bookings */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Active
          </h2>
          <button
            onClick={() => navigate(ROUTES.SERVICE_HISTORY)}
            className="text-eco-600 dark:text-eco-400 text-sm font-medium hover:underline">

            View All
          </button>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="bg-eco-100 dark:bg-eco-900/30 p-2.5 rounded-xl mr-3">
                <CarIcon size={20} className="text-eco-600 dark:text-eco-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                  Car Wash
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Today, 2:30 PM
                </p>
              </div>
            </div>
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
              In Progress
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Progress</span>
              <span>65%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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

          <div className="flex justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={() => navigate(ROUTES.TRACKING)}
              className="text-eco-600 dark:text-eco-400 text-sm font-bold hover:text-eco-700">

              Track Status
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Est. completion: 3:15 PM
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>);

};
export default Home;