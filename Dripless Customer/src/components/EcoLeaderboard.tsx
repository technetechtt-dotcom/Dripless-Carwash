import React, { useState } from 'react';
import { CrownIcon, MedalIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
const EcoLeaderboard = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<'local' | 'global'>('local');
  const leaderboard = [
  {
    rank: 1,
    name: 'Sarah Chen',
    points: 2450,
    level: 'Eco Warrior'
  },
  {
    rank: 2,
    name: 'Mike Ross',
    points: 2100,
    level: 'Green Hero'
  },
  {
    rank: 3,
    name: 'Jessica Pearson',
    points: 1850,
    level: 'Sustainability Pro'
  },
  {
    rank: 4,
    name: user?.name || 'You',
    points: user?.ecoPoints || 1250,
    level: 'Eco Enthusiast',
    isUser: true
  },
  {
    rank: 5,
    name: 'Harvey Specter',
    points: 1100,
    level: 'Nature Lover'
  }];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <CrownIcon size={18} className="text-yellow-500 fill-yellow-500" />);

      case 2:
        return <MedalIcon size={18} className="text-slate-400 fill-slate-400" />;
      case 3:
        return <MedalIcon size={18} className="text-amber-600 fill-amber-600" />;
      default:
        return (
          <span className="text-sm font-bold text-slate-400 w-5 text-center">
            {rank}
          </span>);

    }
  };
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">
          Top Eco Warriors
        </h3>
        <button
          type="button"
          className="text-eco-600 dark:text-eco-400 text-sm font-bold"
          onClick={() => setScope((prev) => (prev === 'local' ? 'global' : 'local'))}>
          {scope === 'local' ? 'Local' : 'Global'}
        </button>
      </div>

      <div className="glass overflow-hidden dark:bg-slate-800/80 p-0">
        {leaderboard.map((entry) =>
        <div
          key={entry.rank}
          className={`flex items-center p-4 border-b border-slate-100 dark:border-slate-700 last:border-0 ${entry.isUser ? 'bg-eco-50/50 dark:bg-eco-900/10' : ''}`}>

            <div className="w-8 flex justify-center mr-3">
              {getRankIcon(entry.rank)}
            </div>

            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-4 shadow-sm">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {entry.name.charAt(0)}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center">
                <h4
                className={`text-sm font-bold ${entry.isUser ? 'text-eco-700 dark:text-eco-400' : 'text-slate-800 dark:text-slate-200'}`}>

                  {entry.name}
                </h4>
                {entry.isUser &&
              <span className="ml-2 text-[10px] font-bold bg-eco-100 dark:bg-eco-900/40 text-eco-700 dark:text-eco-400 px-1.5 py-0.5 rounded">
                    You
                  </span>
              }
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {entry.level}
              </p>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-eco-600 dark:text-eco-400 block">
                {entry.points.toLocaleString()}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                pts
              </span>
            </div>
          </div>
        )}
      </div>
    </div>);

};
export default EcoLeaderboard;