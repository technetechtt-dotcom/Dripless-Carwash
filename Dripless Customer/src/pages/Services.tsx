import React, { Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CarIcon,
  SunIcon,
  DropletIcon,
  SofaIcon,
  BedDoubleIcon,
  PackageIcon,
  HomeIcon,
  BuildingIcon,
  SparklesIcon,
  WrenchIcon,
  ShieldIcon,
  ChevronRightIcon } from
'lucide-react';
import { motion } from 'framer-motion';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};
const item = {
  hidden: {
    opacity: 0,
    y: 16
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};
const Services = () => {
  const navigate = useNavigate();
  const driplessServices = [
  {
    id: 'car-wash',
    title: 'Dripless Car Wash',
    description: 'Waterless & eco-friendly cleaning',
    icon: <CarIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-eco-400 to-eco-600',
    route: '/booking/car-wash'
  },
  {
    id: 'dripless-features',
    title: 'Dripless Hub',
    description: 'Bookings, reports & reminders',
    icon: <SparklesIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-teal-400 to-teal-600',
    route: '/dripless-features'
  }];

  const homeServices = [
  {
    id: 'window-solar-clean',
    title: 'Window & Solar Cleaning',
    description: 'Streak-free, improve efficiency',
    icon: <SunIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
    route: '/booking/window-solar-clean'
  },
  {
    id: 'mattress-cleaning',
    title: 'Mattress Cleaning',
    description: 'Deep clean & sanitize',
    icon: <BedDoubleIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    route: '/booking/mattress-cleaning'
  },
  {
    id: 'couch-cleaning',
    title: 'Couch Cleaning',
    description: 'Revive & refresh upholstery',
    icon: <SofaIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-purple-400 to-purple-600',
    route: '/booking/couch-cleaning'
  },
  {
    id: 'carpet-cleaning',
    title: 'Carpet Cleaning',
    description: 'Deep clean & stain removal',
    icon: <DropletIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-rose-400 to-rose-600',
    route: '/booking/carpet-cleaning'
  }];

  const commercialServices = [
  {
    id: 'fleet-wash',
    title: 'Fleet Wash',
    description: 'Bulk vehicle cleaning for businesses',
    icon: <BuildingIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-700',
    route: '/booking/car-wash'
  },
  {
    id: 'office-cleaning',
    title: 'Office Window Clean',
    description: 'Commercial window services',
    icon: <SunIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-cyan-500 to-cyan-700',
    route: '/booking/window-solar-clean'
  }];

  const specializedServices = [
  {
    id: 'ceramic-coating',
    title: 'Ceramic Coating',
    description: 'Long-lasting paint protection',
    icon: <ShieldIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    route: '/booking/car-wash'
  },
  {
    id: 'engine-detail',
    title: 'Engine Bay Detail',
    description: 'Professional engine cleaning',
    icon: <WrenchIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-red-500 to-red-700',
    route: '/booking/car-wash'
  },
  {
    id: 'headlight-restore',
    title: 'Headlight Restoration',
    description: 'Restore clarity & brightness',
    icon: <SparklesIcon size={20} className="text-white" />,
    gradient: 'bg-gradient-to-br from-yellow-500 to-amber-600',
    route: '/booking/car-wash'
  }];

  const renderServiceCard = (service: (typeof driplessServices)[0]) =>
  <motion.div
    key={service.id}
    variants={item}
    whileTap={{
      scale: 0.98
    }}
    className="glass-card p-4 flex items-center cursor-pointer group"
    onClick={() => navigate(service.route)}>

      <div
      className={`${service.gradient} p-3 rounded-xl mr-3.5 shadow-md group-hover:scale-110 transition-transform duration-300`}>

        {service.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
          {service.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {service.description}
        </p>
      </div>
      <ChevronRightIcon
      size={18}
      className="text-slate-400 dark:text-slate-500" />

    </motion.div>;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full glass">

          <ArrowLeftIcon
            size={20}
            className="text-slate-700 dark:text-slate-200" />

        </motion.button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Our Services
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Dripless Carwash */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1 flex items-center">
            <span className="bg-gradient-to-r from-eco-500 to-teal-600 bg-clip-text text-transparent">
              Dripless
            </span>
            <span className="ml-1.5">Carwash</span>
          </h2>
          <div className="space-y-3">
            {driplessServices.map(renderServiceCard)}
          </div>
        </motion.div>

        {/* Home Services */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1 flex items-center">
            <HomeIcon size={18} className="text-blue-500 mr-2" />
            Home Service
          </h2>
          <div className="space-y-3">{homeServices.map(renderServiceCard)}</div>
        </motion.div>

        {/* Commercial Services */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1 flex items-center">
            <BuildingIcon size={18} className="text-slate-500 mr-2" />
            Commercial
          </h2>
          <div className="space-y-3">
            {commercialServices.map(renderServiceCard)}
          </div>
        </motion.div>

        {/* Specialized Services */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-1 flex items-center">
            <SparklesIcon size={18} className="text-amber-500 mr-2" />
            Specialized Services
          </h2>
          <div className="space-y-3">
            {specializedServices.map(renderServiceCard)}
          </div>
        </motion.div>
      </div>
    </motion.div>);

};
export default Services;