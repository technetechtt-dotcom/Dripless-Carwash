import React from 'react';
import { LeafIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatPoints } from '../utils/currency';

const EcoLeaderboard = () => {
  const { user } = useAuth();
  return <section className="mb-6">
    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Your eco progress</h3>
    <div className="glass dark:bg-slate-800/80 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-eco-100 dark:bg-eco-900/30 flex items-center justify-center"><LeafIcon className="text-eco-600" /></div>
      <div className="flex-1"><p className="font-bold text-slate-900 dark:text-white">{user?.name || 'You'}</p><p className="text-sm text-slate-500">Verified EcoPoints</p></div>
      <strong className="text-eco-600">{formatPoints(user?.ecoPoints || 0)}</strong>
    </div>
    <p className="text-xs text-slate-500 mt-2">Community rankings will appear when a privacy-safe leaderboard service is enabled.</p>
  </section>;
};

export default EcoLeaderboard;
