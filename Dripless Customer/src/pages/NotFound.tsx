import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, SearchXIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '../utils/routes';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-5"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <SearchXIcon className="text-slate-500 dark:text-slate-300" size={28} />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-eco-600 dark:text-eco-400">
            404
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Page not found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            That link is not available in this release. Head home or browse services instead.
          </p>
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            className="btn-primary w-full py-3 font-bold flex items-center justify-center gap-2"
            onClick={() => navigate(ROUTES.HOME)}
          >
            <HomeIcon size={18} />
            Go to Home
          </button>
          <button
            type="button"
            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200"
            onClick={() => navigate(ROUTES.SERVICES)}
          >
            Browse Services
          </button>
        </div>
      </motion.div>
    </main>
  );
};

export default NotFound;
