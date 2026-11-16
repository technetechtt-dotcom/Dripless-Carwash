import React from 'react';
import type { ServiceType } from '@shared/types';
import { isCleaningServiceType } from '@shared/wash-progress';

const CLEANING_STEPS = [
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'en-route', label: 'On the way' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'in-progress', label: 'Cleaning' },
  { id: 'completed', label: 'Done' }
] as const;

const DEFAULT_STEPS = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'completed', label: 'Done' }
] as const;

function cleaningStepIndex(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, '-');
  if (normalized === 'cancelled' || normalized === 'failed') return -1;
  if (normalized === 'completed') return 4;
  if (normalized === 'in-progress') return 3;
  if (normalized === 'arrived') return 2;
  if (normalized === 'en-route') return 1;
  if (normalized === 'confirmed' || normalized === 'assigned') return 0;
  if (normalized === 'pending') return 0;
  return 0;
}

function defaultStepIndex(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, '-');
  if (normalized === 'cancelled' || normalized === 'failed') return -1;
  if (normalized === 'completed') return 3;
  if (
    normalized === 'in-progress' ||
    normalized === 'arrived' ||
    normalized === 'en-route'
  ) {
    return 2;
  }
  if (normalized === 'confirmed' || normalized === 'assigned') return 1;
  if (normalized === 'pending') return 0;
  return 0;
}

export function BookingStatusSteps({
  status,
  serviceType
}: {
  status: string;
  serviceType?: ServiceType | string;
}) {
  const cleaning = serviceType ? isCleaningServiceType(serviceType) : false;
  const steps = cleaning ? CLEANING_STEPS : DEFAULT_STEPS;
  const active = cleaning ? cleaningStepIndex(status) : defaultStepIndex(status);

  if (active < 0) {
    return (
      <p className="text-xs font-bold text-red-600 dark:text-red-400 capitalize">
        {status.replace(/_/g, ' ')}
      </p>
    );
  }

  return (
    <ol
      className={`grid gap-1 ${cleaning ? 'grid-cols-5' : 'grid-cols-4'}`}
      aria-label="Booking status">
      {steps.map((step, index) => {
        const isComplete = index <= active;
        const isCurrent = index === active;
        return (
          <li key={step.id} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-1.5 w-full rounded-full ${
                isComplete
                  ? 'bg-gradient-to-r from-eco-400 to-eco-600'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
              aria-hidden
            />
            <span
              className={`text-[10px] sm:text-xs font-medium text-center ${
                isCurrent
                  ? 'text-eco-700 dark:text-eco-300 font-bold'
                  : isComplete
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
              }`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
