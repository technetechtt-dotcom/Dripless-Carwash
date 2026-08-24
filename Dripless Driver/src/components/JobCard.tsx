import React from 'react';
import { Calendar, Star } from 'lucide-react';
import { formatZar } from '@shared/currency';
import { Job } from '../types';
import { GlassCard } from './ui/GlassCard';
interface JobCardProps {
  job: Job;
}
export function JobCard({ job }: JobCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RIDE':
        return 'bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'WASH':
        return 'bg-cyan-50 text-cyan-600 border-cyan-200/50 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/50';
      case 'PARCEL':
        return 'bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RIDE':
        return 'Ride';
      case 'WASH':
        return 'Car Wash';
      case 'PARCEL':
        return 'Parcel';
      default:
        return type;
    }
  };
  return (
    <GlassCard className="p-4 hover:border-emerald-200/50 dark:hover:border-emerald-700/50 cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(job.type)}`}>

          {getTypeLabel(job.type)}
        </span>
        <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-xs">
          <Calendar size={12} />
          <span>{new Date(job.timestamp).toLocaleDateString()}</span>
          <span>•</span>
          <span>
            {new Date(job.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start space-x-3">
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
            {job.pickupLocation}
          </p>
        </div>
        {job.dropoffLocation &&
        <div className="flex items-start space-x-3">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
              {job.dropoffLocation}
            </p>
          </div>
        }
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center space-x-1">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {formatZar(job.earnings)}
          </span>
        </div>

        {job.status === 'COMPLETED' &&
        <div className="flex items-center space-x-1 text-amber-500">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-medium">{job.customerRating}</span>
          </div>
        }

        {job.status === 'CANCELLED' &&
        <span className="text-xs font-medium text-red-500">Cancelled</span>
        }
      </div>
    </GlassCard>);

}