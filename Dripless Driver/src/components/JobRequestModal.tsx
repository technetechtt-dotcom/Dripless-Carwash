import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { Job } from '../types';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
interface JobRequestModalProps {
  isOpen: boolean;
  job: Job | null;
  onAccept: () => void;
  onDecline: () => void;
}
export function JobRequestModal({
  isOpen,
  job,
  onAccept,
  onDecline
}: JobRequestModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, onDecline]);
  if (!job) return null;
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'RIDE':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200/50 dark:border-blue-800/50'
        };
      case 'WASH':
        return {
          color: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-50 dark:bg-cyan-900/20',
          border: 'border-cyan-200/50 dark:border-cyan-800/50'
        };
      case 'PARCEL':
        return {
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200/50 dark:border-amber-800/50'
        };
      default:
        return {
          color: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700'
        };
    }
  };
  const typeStyles = getTypeStyles(job.type);
  return (
    <AnimatePresence>
      {isOpen &&
      <>
          {/* Backdrop */}
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          onClick={onDecline}
          aria-hidden="true" />


          {/* Modal */}
          <motion.div
          initial={{
            y: '100%'
          }}
          animate={{
            y: 0
          }}
          exit={{
            y: '100%'
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300
          }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-request-title">

            <GlassCard
            elevated
            className="p-6 max-w-md mx-auto relative overflow-hidden">

              {/* Progress Bar Top */}
              <motion.div
              className="absolute top-0 left-0 h-1 bg-emerald-500"
              initial={{
                width: '100%'
              }}
              animate={{
                width: '0%'
              }}
              transition={{
                duration: 30,
                ease: 'linear'
              }} />


              <div className="flex justify-between items-start mb-6">
                <div>
                  <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${typeStyles.bg} ${typeStyles.color} ${typeStyles.border}`}>

                    NEW {job.type} REQUEST
                  </span>
                  <h2
                  id="job-request-title"
                  className="text-3xl font-bold text-slate-900 dark:text-white mt-2">

                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.earnings)}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Estimated earnings
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-slate-700 dark:text-slate-300 font-mono font-bold text-lg">
                    <Clock size={16} className="mr-1 text-emerald-500" />
                    {timeLeft}s
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Auto-decline
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {job.dispatchReason ? (
                  <div className="text-xs rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/50 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                    Auto-dispatch reason: {job.dispatchReason}
                  </div>
                ) : null}
                {job.pooledWithBookingId ? (
                  <div className="text-xs rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 px-3 py-2 text-amber-700 dark:text-amber-300">
                    Parcel pooled with booking {job.pooledWithBookingId}
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center">
                    <Navigation size={16} className="mr-2 text-slate-400" />
                    <span>{job.distance} away</span>
                  </div>
                  <span>•</span>
                  <span>{job.duration} trip</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin
                    className="text-emerald-500 shrink-0 mt-0.5"
                    size={18} />

                    <div>
                      <p className="text-xs text-slate-400 uppercase">PICKUP</p>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {job.pickupLocation}
                      </p>
                    </div>
                  </div>
                  {job.dropoffLocation &&
                <div className="flex items-start space-x-3">
                      <MapPin
                    className="text-red-500 shrink-0 mt-0.5"
                    size={18} />

                      <div>
                        <p className="text-xs text-slate-400 uppercase">
                          DROPOFF
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {job.dropoffLocation}
                        </p>
                      </div>
                    </div>
                }
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GlassButton onClick={onDecline} variant="secondary">
                  Decline
                </GlassButton>
                <GlassButton onClick={onAccept} variant="primary">
                  Accept Job
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}