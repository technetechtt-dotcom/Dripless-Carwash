import React from 'react';
import { CarIcon, SparklesIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIndustryMode } from '../contexts/IndustryModeContext';
import type { IndustryMode } from '@shared/industry-modes';

type Props = {
  className?: string;
  showTagline?: boolean;
};

const OPTIONS: Array<{
  id: IndustryMode;
  label: string;
  icon: typeof SparklesIcon;
}> = [
  { id: 'cleaning', label: 'Cleaning', icon: SparklesIcon },
  { id: 'ehailing', label: 'E-hailing', icon: CarIcon }
];

/**
 * Uber-style industry switch — Cleaning ↔ E-hailing on one platform.
 */
const IndustryModeSwitcher = ({ className = '', showTagline = true }: Props) => {
  const { mode, setMode, meta } = useIndustryMode();

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Switch industry"
        className="relative grid grid-cols-2 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
        {OPTIONS.map((option) => {
          const active = mode === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(option.id)}
              className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              {active && (
                <motion.span
                  layoutId="industry-mode-pill"
                  className={`absolute inset-0 rounded-xl shadow-md ${
                    option.id === 'cleaning'
                      ? 'bg-gradient-to-r from-eco-500 to-teal-600'
                      : 'bg-gradient-to-r from-teal-500 to-emerald-600'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={16} />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      {showTagline && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">{meta.tagline}</p>
      )}
    </div>
  );
};

export default IndustryModeSwitcher;
