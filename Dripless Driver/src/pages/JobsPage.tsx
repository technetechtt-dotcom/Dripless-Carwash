import React, { useEffect, useState } from 'react';
import { JobCard } from '../components/JobCard';
import { Job, JobType } from '../types';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { driverStatsApi } from '@shared/api';
import type { DriverWeekStats } from '@shared/api';

const LAUNCH_JOB_TYPES: Array<'ALL' | JobType> = ['ALL', 'WASH', 'HOME_SERVICE'];

export function JobsPage() {
  const [filter, setFilter] = useState<'ALL' | JobType>('ALL');
  const [weekStats, setWeekStats] = useState<DriverWeekStats | null>(null);
  const { completedBookings } = useDriverBookings();
  const launchJobs = completedBookings.filter((job) => job.type === 'WASH' || job.type === 'HOME_SERVICE');
  const filteredJobs =
    filter === 'ALL' ? launchJobs : launchJobs.filter((job) => job.type === filter);
  const filters: { id: 'ALL' | JobType; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'WASH', label: 'Washes' },
    { id: 'HOME_SERVICE', label: 'Home Services' }
  ];

  useEffect(() => {
    let cancelled = false;
    const loadWeekStats = async () => {
      try {
        const stats = await driverStatsApi.week();
        if (!cancelled) setWeekStats(stats);
      } catch {
        if (!cancelled) setWeekStats(null);
      }
    };
    void loadWeekStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer withOrbs>
      <SectionHeader title="Job History" />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard className="p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide font-medium">
            This Week
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
              weekStats?.earningsWeekZar ?? 0
            )}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide font-medium">
            Total Jobs
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {launchJobs.length}
          </p>
        </GlassCard>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-4 no-scrollbar mb-2" role="tablist">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === item.id
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50'
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <GlassCard className="p-6 text-center text-slate-500 dark:text-slate-400">
            No completed jobs yet for this filter.
          </GlassCard>
        ) : (
          filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </PageContainer>
  );
}
