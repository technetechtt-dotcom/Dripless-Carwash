import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  CloudRainIcon,
  SunIcon,
  TrendingUpIcon,
  ArrowRightIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '../utils/routes';
import type { ImpactSummary } from '@shared/api';
import type { CatalogServiceRecord } from '@shared/catalog-offerings';
import { bookingRouteForServiceSlug } from '@shared/catalog-offerings';

type SmartRecommendationsProps = {
  impact?: ImpactSummary | null;
  catalog?: CatalogServiceRecord[];
};

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ impact, catalog = [] }) => {
  const navigate = useNavigate();
  const hasCarWash = catalog.some((service) => service.slug === 'car-wash');
  const hasSolar = catalog.some((service) => service.slug === 'window-solar-clean');
  const recommendations = [
    hasCarWash && {
      id: 'wash',
      icon: <CloudRainIcon className="text-blue-500 dark:text-blue-400" size={20} />,
      title: 'Keep your eco streak going',
      description: 'Book your next Dripless wash to conserve water and protect your finish.',
      action: 'Book Wash',
      route: ROUTES.BOOK_SERVICE('car-wash'),
      color: 'border-l-4 border-blue-500 dark:border-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    hasSolar && {
      id: 'solar',
      icon: <SunIcon className="text-amber-500 dark:text-amber-400" size={20} />,
      title: 'Solar efficiency boost',
      description: 'Panels due for cleaning can regain efficiency after a professional service.',
      action: 'Clean Panels',
      route: ROUTES.BOOK_SERVICE('window-solar-clean'),
      color: 'border-l-4 border-amber-500 dark:border-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20'
    },
    impact && impact.ecoStreakDays > 0 && {
      id: 'streak',
      icon: <TrendingUpIcon className="text-eco-500 dark:text-eco-400" size={20} />,
      title: `${impact.ecoStreakDays}-day eco streak`,
      description: `You have saved ${impact.co2KgSaved}kg CO₂ so far. Keep the momentum with another service.`,
      action: 'Book Again',
      route: bookingRouteForServiceSlug(catalog[0]?.slug ?? 'car-wash'),
      color: 'border-l-4 border-eco-500 dark:border-eco-400',
      bg: 'bg-eco-50 dark:bg-eco-900/20'
    }
  ].filter(Boolean) as Array<{
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    route: string;
    color: string;
    bg: string;
  }>;

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <SparklesIcon
          size={18}
          className="text-eco-500 dark:text-eco-400 fill-eco-500 dark:fill-eco-400"
        />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Smart Suggestions</h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
            className={`glass p-4 ${rec.color} relative overflow-hidden group hover:scale-[1.01] transition-transform dark:bg-slate-800/60`}>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl ${rec.bg} h-fit`}>{rec.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[220px] font-medium">
                    {rec.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={rec.action}
                className="text-eco-600 dark:text-eco-400 hover:text-eco-700 dark:hover:text-eco-300 transition-colors p-1 bg-slate-50 dark:bg-slate-800 rounded-full"
                onClick={() => navigate(rec.route)}>
                <ArrowRightIcon size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SmartRecommendations;
