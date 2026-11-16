import React from 'react';
import { motion } from 'framer-motion';
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  withOrbs?: boolean;
}
export function PageContainer({
  children,
  className = '',
  withOrbs = false
}: PageContainerProps) {
  return (
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
      className={`min-h-screen pb-24 pt-12 px-4 relative ${className}`}>

      {withOrbs &&
      <>
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute top-20 right-0 w-64 h-64 bg-teal-200/30 dark:bg-teal-900/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        </>
      }
      {children}
    </motion.div>);

}