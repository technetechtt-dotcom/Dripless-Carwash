import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CarIcon,
  SunIcon,
  DropletIcon,
  SofaIcon,
  BedDoubleIcon,
  SparklesIcon,
  HomeIcon,
  ChevronRightIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { catalogApi } from '@shared/api';
import {
  customerServiceCategoryLabels,
  customerServiceOfferings
} from '@shared/customer-offerings';
import {
  filterLaunchCatalog,
  type CatalogServiceRecord
} from '@shared/catalog-offerings';
import { ROUTES } from '../utils/routes';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const iconForOffering = (id: string) => {
  if (id.includes('car') || id.includes('fleet') || id.includes('ceramic') || id.includes('engine') || id.includes('headlight')) {
    return <CarIcon size={20} className="text-white" />;
  }
  if (id.includes('window') || id.includes('solar') || id.includes('office')) {
    return <SunIcon size={20} className="text-white" />;
  }
  if (id.includes('mattress')) return <BedDoubleIcon size={20} className="text-white" />;
  if (id.includes('couch')) return <SofaIcon size={20} className="text-white" />;
  if (id.includes('carpet')) return <DropletIcon size={20} className="text-white" />;
  if (id === 'dripless-features') return <SparklesIcon size={20} className="text-white" />;
  return <SparklesIcon size={20} className="text-white" />;
};

const gradientForCategory = (category: string) => {
  switch (category) {
    case 'HOME_SERVICE':
      return 'bg-gradient-to-br from-blue-400 to-indigo-600';
    case 'COMMERCIAL':
      return 'bg-gradient-to-br from-slate-500 to-slate-700';
    case 'SPECIALIZED':
      return 'bg-gradient-to-br from-amber-500 to-orange-600';
    default:
      return 'bg-gradient-to-br from-eco-400 to-eco-600';
  }
};

const Services = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<CatalogServiceRecord[]>([]);

  useEffect(() => {
    void catalogApi
      .services()
      .then((services) => setCatalog(filterLaunchCatalog(services as CatalogServiceRecord[])))
      .catch(() => setCatalog([]));
  }, []);

  const visibleOfferings = useMemo(() => {
    const activeSlugs = new Set(catalog.map((service) => service.slug));
    const hasHomeService = activeSlugs.has('home-service');
    return customerServiceOfferings.filter((offering) => {
      if (offering.category === 'MOBILITY_DELIVERY') return false;
      if (offering.id === 'car-wash' || offering.id === 'window-solar-clean') {
        return activeSlugs.has(offering.id);
      }
      if (offering.category === 'HOME_SERVICE' && ['mattress-cleaning', 'couch-cleaning', 'carpet-cleaning', 'window-solar-clean'].includes(offering.id)) {
        return offering.id === 'window-solar-clean'
          ? activeSlugs.has('window-solar-clean')
          : hasHomeService;
      }
      return false;
    });
  }, [catalog]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleOfferings>();
    for (const offering of visibleOfferings) {
      const list = map.get(offering.category) ?? [];
      list.push(offering);
      map.set(offering.category, list);
    }
    return map;
  }, [visibleOfferings]);

  const hubCard = {
    id: 'dripless-features',
    title: 'Dripless Hub',
    description: 'Bookings, reports & reminders',
    route: ROUTES.DRIPLESS_FEATURES
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full glass">
          <ArrowLeftIcon size={20} className="text-slate-700 dark:text-slate-200" />
        </motion.button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Our Services</h1>
      </div>

      <div className="p-4 space-y-6">
        {visibleOfferings.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
            No services are currently bookable. Please check back soon.
          </p>
        ) : (
          [...grouped.entries()].map(([category, offerings]) => (
            <motion.div key={category} variants={item} className="space-y-3">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1 flex items-center">
                {category === 'HOME_SERVICE' && <HomeIcon size={18} className="text-blue-500 mr-2" />}
                {customerServiceCategoryLabels[category as keyof typeof customerServiceCategoryLabels]}
              </h2>
              <div className="space-y-3">
                {category === 'DRIPLESS_CARWASH' && (
                  <motion.div
                    variants={item}
                    whileTap={{ scale: 0.98 }}
                    className="glass-card p-4 flex items-center cursor-pointer"
                    onClick={() => navigate(hubCard.route)}>
                    <div className="bg-gradient-to-br from-teal-400 to-teal-600 p-3 rounded-xl mr-3.5 shadow-md">
                      <SparklesIcon size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{hubCard.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{hubCard.description}</p>
                    </div>
                    <ChevronRightIcon size={18} className="text-slate-400 dark:text-slate-500" />
                  </motion.div>
                )}
                {offerings.map((offering) => (
                  <motion.div
                    key={offering.id}
                    variants={item}
                    whileTap={{ scale: 0.98 }}
                    className="glass-card p-4 flex items-center cursor-pointer group"
                    onClick={() => navigate(`/booking/${offering.id}`)}>
                    <div className={`${gradientForCategory(offering.category)} p-3 rounded-xl mr-3.5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {iconForOffering(offering.id)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{offering.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{offering.description}</p>
                    </div>
                    <ChevronRightIcon size={18} className="text-slate-400 dark:text-slate-500" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Services;
