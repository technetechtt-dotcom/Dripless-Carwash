import React from 'react';
import { motion } from 'framer-motion';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { GlassCard } from './ui/GlassCard';
import { EcoBadge } from './ui/EcoBadge';
interface CircularProgressProps {
  value: number;
  label: string;
  color: string;
  inverse?: boolean;
}
function CircularProgress({
  value,
  label,
  color,
  inverse = false
}: CircularProgressProps) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const progress = inverse ? 100 - value : value;
  const offset = circumference - progress / 100 * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-slate-100 dark:text-slate-800" />

          <motion.circle
            initial={{
              strokeDashoffset: circumference
            }}
            animate={{
              strokeDashoffset: offset
            }}
            transition={{
              duration: 1,
              ease: 'easeOut'
            }}
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            className={color} />

        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {value}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">
        {label}
      </span>
    </div>);

}
export function PerformanceMetrics() {
  const { performanceStats } = useDriverBookings();
  return (
    <GlassCard className="p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-slate-900 dark:text-white font-bold text-lg">
          Performance
        </h3>
        <EcoBadge variant="emerald" size="sm">
          Excellent
        </EcoBadge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CircularProgress
          value={performanceStats.acceptanceRate}
          label="Acceptance Rate"
          color="text-emerald-500" />

        <CircularProgress
          value={performanceStats.cancellationRate}
          label="Cancellation Rate"
          color="text-red-500"
          inverse />

        <CircularProgress
          value={performanceStats.onTimeRate}
          label="On-Time Arrival"
          color="text-blue-500" />

      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Total Rides
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {performanceStats.totalRides}
          </span>
        </div>
      </div>
    </GlassCard>);

}