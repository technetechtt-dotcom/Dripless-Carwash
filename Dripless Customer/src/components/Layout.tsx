import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from './Navigation';
const Layout = () => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <main className="flex-1 overflow-y-auto pb-24 px-1 sm:px-0 scroll-smooth">
        <div className="max-w-md mx-auto w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                y: -10
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut'
              }}
              className="h-full">

              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Navigation />
    </div>);

};
export default Layout;