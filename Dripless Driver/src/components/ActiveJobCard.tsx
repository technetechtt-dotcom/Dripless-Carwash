import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Phone, MessageSquare } from 'lucide-react';
import { Job, JobStatus } from '../types';
import { StatusStepper } from './StatusStepper';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { ChatDrawer } from './ChatDrawer';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { buildNavigationUrl } from '@shared/maps';
import { formatZar } from '@shared/currency';
interface ActiveJobCardProps {
  job: Job;
  onStatusUpdate: (newStatus: JobStatus) => void;
}
export function ActiveJobCard({ job, onStatusUpdate }: ActiveJobCardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { messages } = useDriverBookings();
  const unreadCount = messages.filter(
    (m) => !m.read && m.sender === 'customer'
  ).length;
  const handleCallCustomer = () => {
    window.location.href = 'tel:+15550000000';
  };
  const handleStartNavigation = () => {
    const from = job.pickupCoordinates ?? { lat: -26.2041, lng: 28.0473 };
    const to = job.destinationCoordinates ?? job.pickupCoordinates ?? from;
    const url = buildNavigationUrl(from, to);
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleNextStep = () => {
    const statusOrder: JobStatus[] = [
    'EN_ROUTE',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED'];

    const currentIndex = statusOrder.indexOf(job.status);
    if (currentIndex < statusOrder.length - 1) {
      onStatusUpdate(statusOrder[currentIndex + 1]);
    }
  };
  const getButtonText = () => {
    switch (job.status) {
      case 'EN_ROUTE':
        return 'Arrived at Pickup';
      case 'ARRIVED':
        return 'Start Job';
      case 'IN_PROGRESS':
        return 'Complete Job';
      default:
        return 'Completed';
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RIDE':
        return 'text-blue-600 dark:text-blue-400';
      case 'WASH':
        return 'text-cyan-600 dark:text-cyan-400';
      case 'PARCEL':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };
  return (
    <>
      <GlassCard className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg">
              Current Job
            </h3>
            <p className={`text-sm font-medium ${getTypeColor(job.type)}`}>
              {job.type === 'RIDE' ?
              'Passenger Ride' :
              job.type === 'WASH' ?
              'Car Wash' :
              'Parcel Delivery'}
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/50 px-3 py-1 rounded-full">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {formatZar(job.earnings)}
            </span>
          </div>
        </div>

        <StatusStepper status={job.status} />

        <div className="mt-6 space-y-4">
          {job.dispatchReason ? (
            <div className="text-xs rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/50 px-3 py-2 text-emerald-700 dark:text-emerald-300">
              Auto-dispatch reason: {job.dispatchReason}
            </div>
          ) : null}
          {job.pooledWithBookingId ? (
            <div className="text-xs rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 px-3 py-2 text-amber-700 dark:text-amber-300">
              Pooled parcel route with booking {job.pooledWithBookingId}
            </div>
          ) : null}
          {/* Customer Info */}
          <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold">
                {job.customerName.charAt(0)}
              </div>
              <div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {job.customerName}
                </p>
                <div className="flex items-center text-amber-500 text-xs">
                  <span>★ {job.customerRating}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsChatOpen(true)}
                className="relative w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                aria-label="Message customer">

                <MessageSquare size={20} />
                {unreadCount > 0 &&
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                    {unreadCount}
                  </span>
                }
              </button>
              <button
                onClick={handleCallCustomer}
                className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                aria-label="Call customer">

                <Phone size={20} />
              </button>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-3 relative">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-start space-x-3 relative z-10">
              <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Pickup
                </p>
                <p className="text-slate-800 dark:text-slate-200 text-sm">
                  {job.pickupLocation}
                </p>
              </div>
            </div>

            {job.dropoffLocation &&
            <div className="flex items-start space-x-3 relative z-10">
                <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-red-500 flex items-center justify-center shrink-0 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Dropoff
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">
                    {job.dropoffLocation}
                  </p>
                </div>
              </div>
            }
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-3 pt-2">
            <button
              onClick={handleStartNavigation}
              className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Start Navigation">

              <Navigation size={20} className="mb-1" />
              <span className="text-[10px]">Nav</span>
            </button>

            <div className="col-span-3">
              <GlassButton onClick={handleNextStep} className="w-full h-full">
                {getButtonText()}
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        customerName={job.customerName} />

    </>);

}