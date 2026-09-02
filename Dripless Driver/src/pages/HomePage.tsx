import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, DollarSign, Map, Sparkles, Zap } from 'lucide-react';
import { ActiveJobCard } from '../components/ActiveJobCard';
import { OnlineToggle } from '../components/OnlineToggle';
import { MapView } from '../components/MapView';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { PageContainer } from '../components/ui/PageContainer';
import { specialsApi, driverStatsApi, notificationApi } from '@shared/api';
import type { DriverTodayStats } from '@shared/api';
import type { OpsSpecial } from '@shared/types';
import { useToast } from '../contexts/ToastContext';
import { NotificationsPage } from './NotificationsPage';
export function HomePage() {
  const { driver } = useDriverAuth();
  const [liveSpecials, setLiveSpecials] = useState<OpsSpecial[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemFeedback, setRedeemFeedback] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const { showToast } = useToast();
  const [todayStats, setTodayStats] = useState<DriverTodayStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const {
    isOnline,
    setIsOnline,
    activeJob,
    pollAssignedJob,
    updateJobStatus
  } = useDriverBookings();
  useEffect(() => {
    let cancelled = false;
    const loadSpecials = async () => {
      try {
        const specials = await specialsApi.listVisibleSpecials('driver');
        if (!cancelled) {
          setLiveSpecials(specials);
        }
      } catch {
        if (!cancelled) {
          setLiveSpecials([]);
        }
      }
    };
    void loadSpecials();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const stats = await driverStatsApi.today();
        if (!cancelled) setTodayStats(stats);
      } catch {
        if (!cancelled) setTodayStats(null);
      }
    };
    void loadStats();
    const timer = window.setInterval(() => void loadStats(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOnline]);
  useEffect(() => {
    if (!driver?.id) return;
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const count = await notificationApi.unreadCount('driver', driver.id);
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
  }, [driver?.id]);
  const redeemDriverSpecial = async () => {
    if (!driver?.id) {
      setRedeemFeedback('Driver session not available.');
      return;
    }
    const code = redeemCode.trim().toUpperCase();
    if (!code) {
      setRedeemFeedback('Enter a promo code first.');
      return;
    }
    try {
      await specialsApi.redeemSpecial({
        role: 'driver',
        userId: driver.id,
        promoCode: code
      });
      setRedeemFeedback(`Redeemed ${code} successfully.`);
      setRedeemCode('');
    } catch (error) {
      setRedeemFeedback(
        error instanceof Error ? error.message : 'Unable to redeem this code.'
      );
    }
  };
  const showNotificationSummary = () => {
    setShowNotifications(true);
  };
  if (showNotifications) {
    return <NotificationsPage onBack={() => setShowNotifications(false)} />;
  }
  return (
    <PageContainer withOrbs>
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Good evening,
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {driver?.name || 'Driver'}
          </h1>
        </div>
        <button
          className="relative p-2 rounded-full bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
          aria-label="Notifications"
          onClick={showNotificationSummary}>

          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      <main className="space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <DollarSign size={16} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(todayStats?.earningsTodayZar ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Today
            </span>
          </GlassCard>

          <GlassCard className="p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <Zap size={16} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {todayStats?.jobsToday ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Jobs
            </span>
          </GlassCard>

          <GlassCard className="p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <Map size={16} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {(todayStats?.onlineHoursToday ?? 0).toFixed(1)}h
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Online
            </span>
          </GlassCard>
        </div>

        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Driver Specials
            </h2>
          </div>
          {liveSpecials.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No active specials yet. Specials only appear after Ops approval and activation.
            </p>
          ) : (
            <div className="space-y-2">
              {liveSpecials.slice(0, 2).map((special) => (
                <div
                  key={special.id}
                  className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-900/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {special.title}
                    </p>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {special.discountType === 'PERCENT' ?
                        `${special.discountValue}% off` :
                        `${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(special.discountValue)} off`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Code: {special.promoCode}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={(event) => setRedeemCode(event.target.value.toUpperCase())}
              placeholder="Redeem special code"
              className="flex-1 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-xs font-mono tracking-wider text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            <button className="btn-primary px-3 py-2 text-xs" onClick={() => void redeemDriverSpecial()}>
              Redeem
            </button>
          </div>
          {redeemFeedback ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{redeemFeedback}</p>
          ) : null}
        </GlassCard>

        {/* Main Action Area */}
        <div className="flex flex-col items-center justify-center relative space-y-6">
          <AnimatePresence mode="wait">
            {activeJob ?
            <motion.div
              key="active-job"
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              exit={{
                opacity: 0,
                scale: 0.95
              }}
              className="w-full space-y-6">

                <MapView activeJob={activeJob} isOnline={isOnline} />
                <ActiveJobCard
                job={activeJob}
                onStatusUpdate={updateJobStatus} />

              </motion.div> :

            <motion.div
              key="offline-state"
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              className="w-full flex flex-col items-center space-y-8">

                <MapView activeJob={null} isOnline={isOnline} />

                <OnlineToggle
                isOnline={isOnline}
                onToggle={() => void setIsOnline(!isOnline).catch((error) => showToast(error instanceof Error ? error.message : 'Could not change availability', 'error'))} />


                {isOnline &&
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                className="w-full">

                    <GlassButton
                  onClick={pollAssignedJob}
                  variant="secondary"
                  className="w-full py-3">

                      Check for assigned job
                    </GlassButton>
                  </motion.div>
              }
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </main>
    </PageContainer>);

}
