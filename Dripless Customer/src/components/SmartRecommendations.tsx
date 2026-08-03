import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  CloudRainIcon,
  SunIcon,
  TrendingUpIcon,
  ArrowRightIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '../utils/routes';
const SmartRecommendations = () => {
  const navigate = useNavigate();
  const recommendations = [
  {
    id: 1,
    icon:
    <CloudRainIcon className="text-blue-500 dark:text-blue-400" size={20} />,

    title: 'Rainy week ahead?',
    description: 'Schedule a car wash for Thursday for optimal eco-savings.',
    action: 'Book Wash',
    route: ROUTES.BOOK_SERVICE('car-wash'),
    color: 'border-l-4 border-blue-500 dark:border-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  {
    id: 2,
    icon:
    <SunIcon className="text-amber-500 dark:text-amber-400" size={20} />,

    title: 'Solar Efficiency Boost',
    description: 'Your panels are due for cleaning. Boost efficiency by 15%.',
    action: 'Clean Panels',
    route: ROUTES.BOOK_SERVICE('window-solar-clean'),
    color: 'border-l-4 border-amber-500 dark:border-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20'
  },
  {
    id: 3,
    icon:
    <TrendingUpIcon className="text-eco-500 dark:text-eco-400" size={20} />,

    title: 'Eco Streak!',
    description:
    'You saved 12kg CO₂ this month! Book an eco-taxi to keep the streak.',
    action: 'Book Ride',
    route: ROUTES.BOOK_RIDE,
    color: 'border-l-4 border-eco-500 dark:border-eco-400',
    bg: 'bg-eco-50 dark:bg-eco-900/20'
  }];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <SparklesIcon
          size={18}
          className="text-eco-500 dark:text-eco-400 fill-eco-500 dark:fill-eco-400" />

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Smart Suggestions
        </h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, index) =>
        <motion.div
          key={rec.id}
          initial={{
            opacity: 0,
            x: -20
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            delay: index * 0.1
          }}
          whileHover={{
            scale: 1.01
          }}
          className={`glass p-4 ${rec.color} relative overflow-hidden group hover:scale-[1.01] transition-transform dark:bg-slate-800/60`}>

            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl ${rec.bg} h-fit`}>
                  {rec.icon}
                </div>
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
            <div className="absolute top-0 right-0 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-bl-xl">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-wider">
                AI
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>);

};
export default SmartRecommendations;