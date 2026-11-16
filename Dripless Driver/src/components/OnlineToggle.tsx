import React from 'react';
import { motion } from 'framer-motion';
interface OnlineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
}
export function OnlineToggle({ isOnline, onToggle }: OnlineToggleProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onClick={onToggle}
        className="relative focus:outline-none group"
        aria-label={isOnline ? 'Go Offline' : 'Go Online'}
        aria-pressed={isOnline}>

        {/* Glow effect when online */}
        <motion.div
          animate={{
            opacity: isOnline ? 0.4 : 0,
            scale: isOnline ? 1.1 : 1
          }}
          className="absolute inset-0 rounded-full bg-emerald-400 blur-xl" />


        {/* Toggle Track */}
        <motion.div
          className={`w-24 h-12 rounded-full p-1 flex items-center ${isOnline ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400/50' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'} border-2 transition-colors duration-300`}>

          {/* Toggle Knob */}
          <motion.div
            layout
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30
            }}
            className={`w-10 h-10 rounded-full shadow-md ${isOnline ? 'bg-emerald-500' : 'bg-white dark:bg-slate-400'}`} />

        </motion.div>
      </button>
      <span
        className={`text-sm font-medium tracking-wide ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>

        {isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
      </span>
    </div>);

}