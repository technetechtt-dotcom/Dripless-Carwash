import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}
export function GlassButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: GlassButtonProps) {
  const variants = {
    primary:
    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600',
    secondary:
    'bg-white/60 border border-slate-200/50 text-slate-700 hover:bg-white dark:bg-slate-800/60 dark:border-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-slate-800/50',
    danger:
    'bg-red-50 text-red-600 border border-red-200/50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
  };
  return (
    <motion.button
      whileTap={{
        scale: 0.98
      }}
      className={`
        px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}>

      {children}
    </motion.button>);

}