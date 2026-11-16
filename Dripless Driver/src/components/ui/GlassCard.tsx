import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}
export function GlassCard({
  children,
  className = '',
  elevated = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={`
        rounded-2xl border shadow-lg shadow-black/5 backdrop-blur-xl transition-colors
        ${elevated ? 'bg-white/80 border-white/90 dark:bg-slate-800/80 dark:border-slate-700/90' : 'bg-white/60 border-white/80 dark:bg-slate-800/60 dark:border-slate-700/80'}
        ${className}
      `}
      {...props}>

      {children}
    </motion.div>);

}