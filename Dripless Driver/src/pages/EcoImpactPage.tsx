import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Droplets, Wind, Zap, Trophy, TrendingUp } from 'lucide-react';
import { EarningsChart } from '../components/EarningsChart';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EcoBadge } from '../components/ui/EcoBadge';
import { useEcoImpact } from '../hooks/useEcoImpact';
export function EcoImpactPage() {
  const stats = useEcoImpact();
  const challenges = [
    {
      id: 1,
      title: 'Complete 10 eco-washes',
      current: Math.min(stats.washes, 10),
      target: 10,
      icon: Leaf,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
    },
    {
      id: 2,
      title: 'Build your eco streak',
      current: Math.min(stats.ecoStreakDays, 7),
      target: 7,
      icon: Wind,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30'
    },
    {
      id: 3,
      title: 'Water-saving washes',
      current: Math.min(stats.washes, 15),
      target: 15,
      icon: Droplets,
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
    }
  ];

  const leaderboard = [
    {
      rank: 1,
      name: 'You',
      points: stats.totalEcoPoints,
      avatar: 'ME'
    }
  ];

  const ecoData = [
    { name: 'CO₂', amount: stats.co2Saved },
    { name: 'Water', amount: Math.round(stats.waterSaved / 10) },
    { name: 'Points', amount: Math.round(stats.totalEcoPoints / 10) }
  ];

  return (
    <PageContainer withOrbs>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Eco Impact
      </h1>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 mb-8 shadow-lg shadow-emerald-500/20 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Leaf size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-100 font-medium mb-1">Total CO2 Saved</p>
          <div className="flex items-baseline">
            <h2 className="text-5xl font-bold">{stats.co2Saved}</h2>
            <span className="text-xl text-emerald-100 ml-2">kg</span>
          </div>
          <div className="mt-4 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit border border-white/20">
            <Trophy size={16} className="text-yellow-300" />
            <span className="text-white text-sm font-medium">
              {stats.totalEcoPoints.toLocaleString()} EcoPoints earned
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <Leaf size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.treesSaved}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Trees Saved
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2">
            <Droplets size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.waterSaved}L
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Water Saved
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
            <Wind size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {(stats.co2Saved / 1000).toFixed(1)}t
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Carbon Offset
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-2">
            <Zap size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalEcoPoints.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            EcoPoints
          </p>
        </GlassCard>
      </div>

      {/* Weekly Chart */}
      <div className="mb-8">
        <SectionHeader
          title="Weekly Impact"
          action={<TrendingUp size={20} className="text-emerald-500" />} />

        <GlassCard className="p-4">
          <EarningsChart data={ecoData} />
        </GlassCard>
      </div>

      {/* Active Challenges */}
      <div className="mb-8">
        <SectionHeader title="Active Challenges" />
        <div className="space-y-4">
          {challenges.map((challenge) => {
            const Icon = challenge.icon;
            const progress = challenge.current / challenge.target * 100;
            return (
              <GlassCard key={challenge.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${challenge.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                        {challenge.title}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {challenge.current} / {challenge.target} completed
                      </p>
                    </div>
                  </div>
                  <EcoBadge variant="emerald" size="sm">
                    +50 pts
                  </EcoBadge>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{
                      width: 0
                    }}
                    animate={{
                      width: `${progress}%`
                    }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" />

                </div>
              </GlassCard>);

          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mb-8">
        <SectionHeader title="Top Eco Drivers" />
        <GlassCard className="overflow-hidden">
          {leaderboard.map((driver, index) =>
          <div
            key={index}
            className={`flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${driver.rank === 3 ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>

              <div className="flex items-center space-x-4">
                <span
                className={`font-bold w-6 text-center ${driver.rank === 1 ? 'text-yellow-500' : driver.rank === 2 ? 'text-slate-400' : driver.rank === 3 ? 'text-amber-700 dark:text-amber-500' : 'text-slate-400'}`}>

                  #{driver.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">
                  {driver.avatar}
                </div>
                <span
                className={`text-sm font-medium ${driver.rank === 3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>

                  {driver.name}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {driver.points} pts
              </span>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Eco Tip */}
      <div className="bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl p-4 flex items-start space-x-4">
        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg shrink-0">
          <Leaf className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div>
          <p className="text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase mb-1">
            Eco Tip of the Day
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Smooth acceleration and braking can reduce your fuel consumption by
            up to 15%.
          </p>
        </div>
      </div>
    </PageContainer>);

}