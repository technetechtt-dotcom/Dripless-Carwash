import React, { useState } from 'react';
import { EarningsChart } from '../components/EarningsChart';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { useDriverStats } from '../hooks/useDriverStats';
export function EarningsPage() {
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  const { completedBookings } = useDriverBookings();
  const stats = useDriverStats(completedBookings);
  // Mock chart data (in a real app, this would come from useDriverStats too)
  const chartData = [
  {
    name: 'Mon',
    amount: 120
  },
  {
    name: 'Tue',
    amount: 150
  },
  {
    name: 'Wed',
    amount: 180
  },
  {
    name: 'Thu',
    amount: 90
  },
  {
    name: 'Fri',
    amount: 210
  },
  {
    name: 'Sat',
    amount: 250
  },
  {
    name: 'Sun',
    amount: 142
  }];

  return (
    <PageContainer withOrbs>
      <SectionHeader title="Earnings" />

      {/* Period Toggle */}
      <div className="flex bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 p-1 rounded-xl mb-8 shadow-sm">
        {['DAY', 'WEEK', 'MONTH'].map((p) =>
        <button
          key={p}
          onClick={() => setPeriod(p as any)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>

            {p === 'DAY' ? 'TODAY' : p === 'WEEK' ? 'THIS WEEK' : 'THIS MONTH'}
          </button>
        )}
      </div>

      {/* Main Earnings Display */}
      <div className="text-center mb-8">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
          Total Earnings
        </p>
        <h2 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          ${(1142 + stats.totalEarnings).toFixed(2)}
        </h2>
      </div>

      {/* Chart */}
      <GlassCard className="p-4 mb-8">
        <EarningsChart data={chartData} />
      </GlassCard>

      {/* Breakdown */}
      <div className="space-y-6">
        <SectionHeader title="Breakdown" />

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Rides</span>
              <span className="text-slate-900 dark:text-white font-medium">
                ${(640 + stats.breakdown.RIDE).toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[60%]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Car Washes
              </span>
              <span className="text-slate-900 dark:text-white font-medium">
                ${(320 + stats.breakdown.WASH).toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 w-[30%]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Parcels
              </span>
              <span className="text-slate-900 dark:text-white font-medium">
                ${(182 + stats.breakdown.PARCEL).toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[10%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="mt-8 space-y-4">
        <SectionHeader title="Recent Payouts" />
        <GlassCard className="p-4 flex justify-between items-center">
          <div>
            <p className="text-slate-900 dark:text-white font-medium">
              Weekly Payout
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Feb 12, 2024
            </p>
          </div>
          <div className="text-right">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
              +$850.25
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Deposited
            </p>
          </div>
        </GlassCard>
      </div>
    </PageContainer>);

}