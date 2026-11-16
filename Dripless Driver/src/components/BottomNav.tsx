import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, DollarSign, Home, Leaf, User } from 'lucide-react';
import { DRIVER_TABS } from '../utils/routes';
interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
  {
    id: DRIVER_TABS.HOME,
    label: 'Home',
    icon: Home
  },
  {
    id: DRIVER_TABS.JOBS,
    label: 'Jobs',
    icon: ClipboardList
  },
  {
    id: DRIVER_TABS.IMPACT,
    label: 'Impact',
    icon: Leaf
  },
  {
    id: DRIVER_TABS.EARNINGS,
    label: 'Earn',
    icon: DollarSign
  },
  {
    id: DRIVER_TABS.PROFILE,
    label: 'Profile',
    icon: User
  }];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 pb-safe pt-2 px-2 z-50 shadow-lg shadow-emerald-900/5"
      role="navigation"
      aria-label="Main navigation">

      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center w-14 h-14 focus:outline-none"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}>

              {isActive &&
              <motion.div
                layoutId="nav-pill"
                className="absolute -top-2 w-10 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30
                }} />

              }

              <div
                className={`transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>

                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.2 : 0} />

              </div>

              <span
                className={`text-[9px] mt-1 font-medium transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>

                {tab.label}
              </span>
            </button>);

        })}
      </div>
    </nav>);

}