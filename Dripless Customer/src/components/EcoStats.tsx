import React from 'react';
import { DropletIcon, LeafIcon, TrashIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ImpactSummary } from '@shared/api';

type EcoStatsProps = {
  compact?: boolean;
  summary?: ImpactSummary | null;
  loading?: boolean;
};

const EcoStats: React.FC<EcoStatsProps> = ({ compact = false, summary, loading = false }) => {
  const stats = [
    {
      icon: <LeafIcon size={compact ? 16 : 22} className="text-eco-500 dark:text-eco-400" />,
      value: summary ? String(summary.co2KgSaved) : '0',
      unit: 'kg',
      label: 'CO₂ Saved',
      bg: 'bg-eco-50 dark:bg-eco-900/20',
      border: 'border-eco-100 dark:border-eco-900/30'
    },
    {
      icon: <DropletIcon size={compact ? 16 : 22} className="text-blue-500 dark:text-blue-400" />,
      value: summary ? String(Math.round(summary.waterSavedLitres)) : '0',
      unit: 'L',
      label: 'Water Conserved',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-900/30'
    },
    {
      icon: <TrashIcon size={compact ? 16 : 22} className="text-orange-500 dark:text-orange-400" />,
      value: summary ? String(summary.plasticKgReduced) : '0',
      unit: 'kg',
      label: 'Plastic Reduced',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-100 dark:border-orange-900/30'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="glass-card p-4 animate-pulse h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} ${stat.border} border rounded-xl p-3 text-center`}>
            <div className="flex justify-center mb-1">{stat.icon}</div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {stat.value}
              <span className="text-[10px] font-medium text-slate-500 ml-0.5">{stat.unit}</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className={`glass-card p-4 ${stat.bg} border ${stat.border} rounded-2xl text-center`}>
          <div className="flex justify-center mb-2">{stat.icon}</div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {stat.value}
            <span className="text-xs font-medium text-slate-500 ml-1">{stat.unit}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default EcoStats;
