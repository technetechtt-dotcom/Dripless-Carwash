import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CarIcon,
  UserIcon,
  PlusCircleIcon,
  SparklesIcon,
  XIcon,
  SunIcon,
  BedDoubleIcon,
  SofaIcon,
  DropletIcon,
  BuildingIcon,
  ChevronRightIcon,
  ShieldIcon,
  WrenchIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBookingPicker, setShowBookingPicker] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const leftNavItems = [
  {
    path: '/home',
    icon: HomeIcon,
    label: 'Home'
  },
  {
    path: '/dripless-features',
    icon: SparklesIcon,
    label: 'Dripless'
  }];

  const rightNavItems = [
  {
    path: '/services',
    icon: CarIcon,
    label: 'Services'
  },
  {
    path: '/profile',
    icon: UserIcon,
    label: 'Profile'
  }];

  const bookingCategories = [
  {
    id: 'dripless',
    title: 'Dripless Carwash',
    subtitle: 'Waterless & eco-friendly',
    icon: SparklesIcon,
    gradient: 'from-eco-500 to-teal-600',
    iconBg: 'bg-eco-100 dark:bg-eco-900/30',
    iconColor: 'text-eco-600 dark:text-eco-400',
    services: [
    {
      name: 'Dripless Car Wash',
      route: '/booking/car-wash',
      icon: CarIcon
    },
    {
      name: 'Ceramic Coating',
      route: '/booking/car-wash',
      icon: ShieldIcon
    },
    {
      name: 'Engine Bay Detail',
      route: '/booking/car-wash',
      icon: WrenchIcon
    },
    {
      name: 'Headlight Restoration',
      route: '/booking/car-wash',
      icon: SparklesIcon
    }]

  },
  {
    id: 'home',
    title: 'Home Service',
    subtitle: 'Cleaning for your home',
    icon: HomeIcon,
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    services: [
    {
      name: 'Window & Solar Cleaning',
      route: '/booking/window-solar-clean',
      icon: SunIcon
    },
    {
      name: 'Mattress Cleaning',
      route: '/booking/mattress-cleaning',
      icon: BedDoubleIcon
    },
    {
      name: 'Couch Cleaning',
      route: '/booking/couch-cleaning',
      icon: SofaIcon
    },
    {
      name: 'Carpet Cleaning',
      route: '/booking/carpet-cleaning',
      icon: DropletIcon
    }]

  },
  {
    id: 'commercial',
    title: 'Commercial',
    subtitle: 'Business & fleet services',
    icon: BuildingIcon,
    gradient: 'from-slate-500 to-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-400',
    services: [
    {
      name: 'Fleet Wash',
      route: '/booking/car-wash',
      icon: CarIcon
    },
    {
      name: 'Office Window Clean',
      route: '/booking/window-solar-clean',
      icon: SunIcon
    }]

  }];

  const handleServiceSelect = (route: string) => {
    setShowBookingPicker(false);
    setExpandedCategory(null);
    navigate(route);
  };
  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };
  const renderNavItem = (item: (typeof leftNavItems)[0]) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className="relative flex flex-col items-center justify-center w-14 h-16 rounded-2xl z-10">

        {isActive &&
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-eco-50 dark:bg-eco-900/20 rounded-2xl -z-10"
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }} />

        }
        <motion.div
          animate={{
            scale: isActive ? 1.1 : 1,
            color: isActive ? 'var(--color-eco-600)' : 'var(--color-slate-400)'
          }}
          className={`flex flex-col items-center ${isActive ? 'text-eco-600 dark:text-eco-400' : 'text-slate-400 dark:text-slate-500'}`}>

          <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
        </motion.div>
      </NavLink>);

  };
  return (
    <>
      <nav className="fixed bottom-0 w-full glass-nav z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-20 px-1 relative">
          {leftNavItems.map(renderNavItem)}
          <div className="w-14" />
          {rightNavItems.map(renderNavItem)}

          {/* Floating Action Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <motion.button
              onClick={() => setShowBookingPicker(true)}
              whileTap={{
                scale: 0.95
              }}
              className="flex flex-col items-center justify-center">

              <motion.div
                animate={{
                  rotate: showBookingPicker ? 45 : 0
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-eco-500 to-teal-500 shadow-lg shadow-eco-500/30 flex items-center justify-center text-white">

                <PlusCircleIcon size={28} />
              </motion.div>
              <span className="text-[9px] font-medium mt-0.5 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 rounded-full backdrop-blur-sm">
                Book
              </span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Booking Category Picker */}
      <AnimatePresence>
        {showBookingPicker &&
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              setShowBookingPicker(false);
              setExpandedCategory(null);
            }} />

            <motion.div
            initial={{
              y: '100%'
            }}
            animate={{
              y: 0
            }}
            exit={{
              y: '100%'
            }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 350
            }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>

              <div className="px-5 pb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Book a Service
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose a category to get started
                  </p>
                </div>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => {
                  setShowBookingPicker(false);
                  setExpandedCategory(null);
                }}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={18} className="text-slate-500" />
                </motion.button>
              </div>

              <div className="px-5 pb-8 pt-2 space-y-2.5 max-h-[70vh] overflow-y-auto">
                {bookingCategories.map((category) => {
                const CatIcon = category.icon;
                const isExpanded = expandedCategory === category.id;
                return (
                  <motion.div
                    key={category.id}
                    layout
                    className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">

                      <motion.button
                      whileTap={{
                        scale: 0.98
                      }}
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 flex items-center justify-between">

                        <div className="flex items-center">
                          <div
                          className={`bg-gradient-to-br ${category.gradient} p-3 rounded-xl mr-3.5 shadow-md`}>

                            <CatIcon size={20} className="text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              {category.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {category.subtitle}
                            </p>
                          </div>
                        </div>
                        <motion.div
                        animate={{
                          rotate: isExpanded ? 90 : 0
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 25
                        }}>

                          <ChevronRightIcon
                          size={18}
                          className="text-slate-400" />

                        </motion.div>
                      </motion.button>

                      <AnimatePresence>
                        {isExpanded &&
                      <motion.div
                        initial={{
                          height: 0,
                          opacity: 0
                        }}
                        animate={{
                          height: 'auto',
                          opacity: 1
                        }}
                        exit={{
                          height: 0,
                          opacity: 0
                        }}
                        transition={{
                          type: 'spring',
                          damping: 25,
                          stiffness: 300
                        }}
                        className="overflow-hidden">

                            <div className="px-3 pb-3 space-y-1">
                              {category.services.map((service, idx) => {
                            const SvcIcon = service.icon;
                            return (
                              <motion.button
                                key={service.name}
                                initial={{
                                  opacity: 0,
                                  x: -10
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0
                                }}
                                transition={{
                                  delay: idx * 0.05
                                }}
                                whileTap={{
                                  scale: 0.97
                                }}
                                onClick={() =>
                                handleServiceSelect(service.route)
                                }
                                className="w-full flex items-center p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-eco-50 dark:hover:bg-slate-700/50 transition-colors">

                                    <div
                                  className={`${category.iconBg} p-2 rounded-lg mr-3`}>

                                      <SvcIcon
                                    size={16}
                                    className={category.iconColor} />

                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 text-left">
                                      {service.name}
                                    </span>
                                    <ChevronRightIcon
                                  size={14}
                                  className="text-slate-300 dark:text-slate-600" />

                                  </motion.button>);

                          })}
                            </div>
                          </motion.div>
                      }
                      </AnimatePresence>
                    </motion.div>);

              })}

                {/* Browse all link */}
                <motion.button
                whileTap={{
                  scale: 0.97
                }}
                onClick={() => {
                  setShowBookingPicker(false);
                  setExpandedCategory(null);
                  navigate('/services');
                }}
                className="w-full py-3 text-center text-sm font-bold text-eco-600 dark:text-eco-400 hover:bg-eco-50 dark:hover:bg-eco-900/20 rounded-xl transition-colors">

                  Browse All Services
                </motion.button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </>);

};
export default Navigation;