import React from 'react';
import { DropletIcon, LeafIcon, TrashIcon } from 'lucide-react';
import { motion } from 'framer-motion';
type EcoStatsProps = {
  compact?: boolean;
};
const EcoStats: React.FC<EcoStatsProps> = ({ compact = false }) => {
  const stats = [
  {
    icon:
    <LeafIcon
      size={compact ? 16 : 22}
      className="text-eco-500 dark:text-eco-400" />,


    value: '12.4',
    unit: 'kg',
    label: 'CO₂ Saved',
    bg: 'bg-eco-50 dark:bg-eco-900/20',
    border: 'border-eco-100 dark:border-eco-900/30'
  },
  {
    icon:
    <DropletIcon
      size={compact ? 16 : 22}
      className="text-blue-500 dark:text-blue-400" />,


    value: '346',
    unit: 'L',
    label: 'Water Conserved',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-100 dark:border-blue-900/30'
  },
  {
    icon:
    <TrashIcon
      size={compact ? 16 : 22}
      className="text-orange-500 dark:text-orange-400" />,


    value: '5.2',
    unit: 'kg',
    label: 'Plastic Reduced',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-100 dark:border-orange-900/30'
  }];

  if (compact) {
    return (
      <div className="flex justify-between items-center bg-eco-50/50 dark:bg-slate-800/50 rounded-xl p-3 border border-eco-100 dark:border-slate-700">
        {stats.map((stat, index) =>
        <div key={index} className="flex items-center">
            {stat.icon}
            <div className="ml-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {stat.value}
                {stat.unit}
              </span>
            </div>
          </div>
        )}
      </div>);

  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, index) =>
      <motion.div
        key={index}
        initial={{
          opacity: 0,
          scale: 0.9
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          delay: index * 0.1
        }}
        className={`glass p-3 flex flex-col items-center text-center dark:bg-slate-800/60`}>

          <div className={`p-2.5 rounded-full mb-2 ${stat.bg}`}>
            {stat.icon}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {stat.value}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-0.5">
                {stat.unit}
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">
              {stat.label}
            </div>
          </div>
        </motion.div>
      )}
    </div>);

};
export default EcoStats;