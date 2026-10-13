import React from 'react';

const STEPS = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'completed', label: 'Done' }
] as const;

function stepIndex(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, '-');
  if (normalized === 'cancelled' || normalized === 'failed') return -1;
  if (normalized === 'completed') return 3;
  if (normalized === 'in-progress' || normalized === 'arrived') return 2;
  if (normalized === 'confirmed' || normalized === 'assigned') return 1;
  if (normalized === 'pending') return 0;
  return 0;
}

export function BookingStatusSteps({ status }: { status: string }) {
  const active = stepIndex(status);
  if (active < 0) {
    return (
      <p className="text-xs font-bold text-red-600 dark:text-red-400 capitalize">
        {status.replace(/_/g, ' ')}
      </p>
    );
  }

  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Booking status">
      {STEPS.map((step, index) => {
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
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
