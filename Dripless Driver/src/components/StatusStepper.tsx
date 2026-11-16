import React from 'react';
import { Check, Circle, MapPin, Navigation, User } from 'lucide-react';
import { JobStatus } from '../types';
interface StatusStepperProps {
  status: JobStatus;
}
export function StatusStepper({ status }: StatusStepperProps) {
  const steps = [
  {
    id: 'EN_ROUTE',
    label: 'En Route',
    icon: Navigation
  },
  {
    id: 'ARRIVED',
    label: 'Arrived',
    icon: MapPin
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    icon: User
  },
  {
    id: 'COMPLETED',
    label: 'Complete',
    icon: Check
  }];

  // Helper to determine step state: 'completed' | 'current' | 'upcoming'
  const getStepState = (stepId: string) => {
    const statusOrder = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepId);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };
  return (
    <div className="w-full py-4" role="list" aria-label="Job progress">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line Background */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />

        {/* Steps */}
        {steps.map((step, index) => {
          const state = getStepState(step.id);
          const isCompleted = state === 'completed';
          const isCurrent = state === 'current';
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex flex-col items-center bg-white/0 px-1"
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}>

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isCurrent ? 'bg-white dark:bg-slate-800 border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600'}`}>

                {isCompleted ?
                <Check size={14} strokeWidth={3} /> :

                <Icon size={14} />
                }
              </div>
              <span
                className={`text-[10px] mt-2 font-medium transition-colors duration-300 ${isCurrent || isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>

                {step.label}
              </span>
            </div>);

        })}
      </div>
    </div>);

}