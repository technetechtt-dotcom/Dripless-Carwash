import React from 'react';
interface EcoBadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'amber' | 'cyan' | 'slate' | 'red';
  className?: string;
  size?: 'sm' | 'md';
}
export function EcoBadge({
  children,
  variant = 'emerald',
  className = '',
  size = 'md'
}: EcoBadgeProps) {
  const variants = {
    emerald:
    'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
    blue: 'bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
    amber:
    'bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200/50 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800/50',
    slate:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    red: 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold border ${variants[variant]} ${sizes[size]} ${className}`}>

      {children}
    </span>);

}