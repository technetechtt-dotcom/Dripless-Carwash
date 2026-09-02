import React, { useState } from 'react';
import { JobCard } from '../components/JobCard';
import { Job, JobType } from '../types';
import { customerServiceOfferings } from '@shared/customer-offerings';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useDriverBookings } from '../contexts/DriverBookingContext';
export function JobsPage() {
  const [filter, setFilter] = useState<'ALL' | JobType>('ALL');
  const { completedBookings } = useDriverBookings();
  const allJobs: Job[] = completedBookings;
  const filteredJobs =
  filter === 'ALL' ? allJobs : allJobs.filter((j) => j.type === filter);
  const filters: {
    id: 'ALL' | JobType;
    label: string;
  }[] = [
  {
    id: 'ALL',
    label: 'All'
  },
  {
    id: 'RIDE',
    label: 'Rides'
  },
  {
    id: 'WASH',
    label: 'Washes'
  },
  {
    id: 'PARCEL',
    label: 'Parcels'
  },
  {
    id: 'HOME_SERVICE',
    label: 'Home Services'
  }];

  const supportedServiceCount = customerServiceOfferings.filter(
    (offering) => offering.category !== 'MOBILITY_DELIVERY'
  ).length;

  return (
    <PageContainer withOrbs>
      <SectionHeader title="Job History" />
      <GlassCard className="p-4 mb-5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Full customer service coverage enabled
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Driver platform now supports all {supportedServiceCount} customer-facing services.
        </p>
      </GlassCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard className="p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide font-medium">
            This Week
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            $850.25
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide font-medium">
            Total Jobs
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {allJobs.length}
          </p>
        </GlassCard>
      </div>

      {/* Filters */}
      <div
        className="flex space-x-2 overflow-x-auto pb-4 no-scrollbar mb-2"
        role="tablist">

        {filters.map((f) =>
        <button
          key={f.id}
          onClick={() => setFilter(f.id)}
          role="tab"
          aria-selected={filter === f.id}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800'}`}>

            {f.label}
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredJobs.map((job) =>
        <JobCard key={job.id} job={job} />
        )}
      </div>
    </PageContainer>);

}