import React, { useEffect, useMemo, useState } from 'react';
import {
  CarIcon,
  SunIcon,
  BellIcon,
  FlameIcon,
  TrendingUpIcon,
  SparklesIcon,
  HomeIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EcoStats from '../components/EcoStats';
import ServiceCard from '../components/ServiceCard';
import SmartRecommendations from '../components/SmartRecommendations';
import { useAuth } from '../contexts/AuthContext';
import { useBookings } from '../contexts/BookingContext';
import { ROUTES } from '../utils/routes';
import { catalogApi, impactApi, notificationApi } from '@shared/api';
import type { ImpactSummary } from '@shared/api';
import {
  bookingRouteForServiceSlug,
  filterLaunchCatalog,
  QUICK_SERVICE_PRESENTATION,
  type CatalogServiceRecord
} from '@shared/catalog-offerings';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function bookingProgress(status: string) {
  switch (status) {
    case 'pending':
      return 25;
    case 'confirmed':
      return 45;
    case 'in-progress':
      return 70;
    default:
      return 15;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'in-progress':
      return 'In Progress';
    default:
      return status;
  }
}

const quickServiceIcon = (slug: string) => {
  const kind = QUICK_SERVICE_PRESENTATION[slug]?.icon;
  if (kind === 'solar') return <SunIcon size={24} className="text-white" />;
  if (kind === 'home') return <HomeIcon size={24} className="text-white" />;
  return <SparklesIcon size={24} className="text-white" />;
};

const Home = () => {
  const { user } = useAuth();
  const { activeBookings } = useBookings();
  const navigate = useNavigate();
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [catalog, setCatalog] = useState<CatalogServiceRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingImpact, setLoadingImpact] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [summary, services] = await Promise.all([
          impactApi.summary(),
          catalogApi.services()
        ]);
        if (!cancelled) {
          setImpact(summary);
          setCatalog(filterLaunchCatalog(services as CatalogServiceRecord[]));
        }
      } catch {
        if (!cancelled) {
          setImpact(null);
          setCatalog([]);
        }
      } finally {
        if (!cancelled) setLoadingImpact(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const count = await notificationApi.unreadCount('customer', user.id);
        if (!cancelled) setUnreadCount(count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const quickServices = useMemo(
    () =>
      catalog.slice(0, 4).map((service) => {
        const presentation = QUICK_SERVICE_PRESENTATION[service.slug] ?? {
          title: service.name,
          description: service.description ?? 'Book now',
          gradient: 'bg-gradient-to-br from-eco-400 to-eco-600',
          icon: 'wash' as const
        };
        return {
          slug: service.slug,
          title: presentation.title,
          description: presentation.description,
          gradient: presentation.gradient,
          route: bookingRouteForServiceSlug(service.slug)
        };
      }),
    [catalog]
  );

  const primaryActive = activeBookings[0];
  const streakDays = impact?.ecoStreakDays ?? 0;

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
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          className="p-3 glass rounded-full relative hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
          <BellIcon size={22} className="text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.button>
      </motion.div>

      {streakDays > 0 && (
        <motion.div
          variants={item}
          className="flex items-center glass p-4 rounded-2xl border-l-4 border-l-orange-500 dark:bg-slate-900/40">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full mr-4">
            <FlameIcon
              size={20}
              className="text-orange-500 dark:text-orange-400 fill-orange-500"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {streakDays}-day eco streak
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {impact?.ecoPoints ?? 0} eco points earned
            </p>
          </div>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
            {streakDays} days
          </span>
        </motion.div>
      )}

      <motion.div variants={item}>
        <SmartRecommendations impact={impact} catalog={catalog} />
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Your Impact</h2>
          <button
            onClick={() => navigate(ROUTES.REWARDS)}
            className="text-eco-600 dark:text-eco-400 text-sm font-medium hover:underline">
            View All
          </button>
        </div>
        <EcoStats summary={impact} loading={loadingImpact} />
        {impact && impact.projectedCo2KgYear > 0 && (
          <div className="mt-4 glass p-4 rounded-2xl flex items-center border-l-4 border-l-eco-500 dark:bg-slate-900/40">
            <div className="bg-eco-100 dark:bg-eco-900/30 p-2 rounded-full mr-3">
              <TrendingUpIcon size={20} className="text-eco-600 dark:text-eco-400" />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Projected savings:{' '}
              <span className="font-bold text-eco-700 dark:text-eco-400">
                {impact.projectedCo2KgYear}kg CO₂
              </span>{' '}
              this year based on your completed services.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-1">
          Quick Services
        </h2>
        {quickServices.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
            No bookable services are available in your area right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {quickServices.map((service) => (
              <ServiceCard
                key={service.slug}
                title={service.title}
                description={service.description}
                icon={quickServiceIcon(service.slug)}
                color={service.gradient}
                route={service.route}
              />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={item}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(ROUTES.DRIPLESS_FEATURES)}
          className="glass-card p-5 cursor-pointer border-l-4 border-l-eco-500 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-eco-400 to-teal-600 p-3 rounded-xl mr-4 shadow-md">
              <SparklesIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Dripless Hub</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bookings, reports, reminders & feedback
              </p>
            </div>
          </div>
          <div className="bg-eco-100 dark:bg-eco-900/30 px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-eco-700 dark:text-eco-400">Open</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Active</h2>
          <button
            onClick={() => navigate(ROUTES.SERVICE_HISTORY)}
            className="text-eco-600 dark:text-eco-400 text-sm font-medium hover:underline">
            View All
          </button>
        </div>
        {!primaryActive ? (
          <div className="glass-card p-5 text-sm text-slate-500 dark:text-slate-400">
            No active bookings. Book a service to get started.
          </div>
        ) : (
          <div className="glass-card p-5 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="bg-eco-100 dark:bg-eco-900/30 p-2.5 rounded-xl mr-3">
                  <CarIcon size={20} className="text-eco-600 dark:text-eco-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    {primaryActive.service}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {primaryActive.date}, {primaryActive.time}
                  </p>
                </div>
              </div>
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                {statusLabel(primaryActive.status)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Progress</span>
                <span>{bookingProgress(primaryActive.status)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bookingProgress(primaryActive.status)}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-eco-400 to-eco-600 rounded-full"
                />
              </div>
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={() => navigate(`${ROUTES.TRACKING}?bookingId=${primaryActive.id}`)}
                className="text-eco-600 dark:text-eco-400 text-sm font-bold hover:text-eco-700">
                Track Status
              </button>
              <span className="text-xs text-slate-400">{primaryActive.location}</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Home;
