import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  FileText,
  HelpCircle,
  Settings,
  User,
  Car,
  Star } from
'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { DriverDetailsPage } from './DriverDetailsPage';
import { DocumentsPage } from './DocumentsPage';
import { SettingsPage } from './SettingsPage';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { PerformanceMetrics } from '../components/PerformanceMetrics';
import { DRIVER_PROFILE_VIEWS } from '../utils/routes';
type ProfileView = (typeof DRIVER_PROFILE_VIEWS)[keyof typeof DRIVER_PROFILE_VIEWS];
export function ProfilePage() {
  const { driver } = useDriverAuth();
  const [currentView, setCurrentView] = useState<ProfileView>(
    DRIVER_PROFILE_VIEWS.MAIN
  );
  const MainProfileView = () =>
  <PageContainer withOrbs>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Profile
      </h1>

      {/* Profile Header */}
      <div
      className="flex items-center space-x-4 mb-8 cursor-pointer active:opacity-80 transition-opacity"
      onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.DETAILS)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === 'Enter' && setCurrentView(DRIVER_PROFILE_VIEWS.DETAILS)
      }>

        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg">
            {driver?.avatarUrl ?
          <img
            src={driver.avatarUrl}
            alt={driver.name}
            className="w-full h-full object-cover" /> :


          <User size={40} />
          }
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {driver?.name || 'Driver'}
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
              <Star size={10} className="mr-1 fill-amber-500" />
              <span className="font-bold">{driver?.rating || '0.0'}</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              Member since{' '}
              {driver?.memberSince ?
            new Date(driver.memberSince).getFullYear() :
            '2024'}
            </span>
          </div>
        </div>
        <ChevronRight className="text-slate-400" />
      </div>

      {/* Performance Metrics */}
      <div className="mb-8">
        <PerformanceMetrics />
      </div>

      {/* Eco Points Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg shadow-emerald-500/20 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <User size={100} />
        </div>
        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">
          Eco Balance
        </p>
        <h3 className="text-3xl font-bold">
          {driver?.ecoPoints.toLocaleString()} pts
        </h3>
        <p className="text-emerald-100 text-sm mt-2">
          Top 5% of drivers this week!
        </p>
      </div>

      {/* Menu Options */}
      <div className="space-y-6">
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1 mb-3">
            Account
          </h3>
          <GlassCard className="overflow-hidden">
            <button
            onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.DETAILS)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50">

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500 dark:text-blue-400">
                  <User size={20} />
                </div>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Personal Details
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
            onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.DOCUMENTS)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50">

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-500 dark:text-amber-400">
                  <FileText size={20} />
                </div>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Documents
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-bold text-red-500 dark:text-red-400 mr-2 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                  1 Action
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
            onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.DETAILS)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-500 dark:text-purple-400">
                  <Car size={20} />
                </div>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Vehicle Info
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </GlassCard>
        </div>

        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1 mb-3">
            App Settings
          </h3>
          <GlassCard className="overflow-hidden">
            <button
            onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.SETTINGS)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50">

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                  <Settings size={20} />
                </div>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Preferences
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
            onClick={() => setCurrentView(DRIVER_PROFILE_VIEWS.SETTINGS)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                  <HelpCircle size={20} />
                </div>
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  Help & Support
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </GlassCard>
        </div>
      </div>
    </PageContainer>;

  return (
    <AnimatePresence mode="wait">
      {currentView === DRIVER_PROFILE_VIEWS.MAIN &&
      <MainProfileView key={DRIVER_PROFILE_VIEWS.MAIN} />}
      {currentView === DRIVER_PROFILE_VIEWS.DETAILS &&
      <DriverDetailsPage
        key={DRIVER_PROFILE_VIEWS.DETAILS}
        onBack={() => setCurrentView(DRIVER_PROFILE_VIEWS.MAIN)} />

      }
      {currentView === DRIVER_PROFILE_VIEWS.DOCUMENTS &&
      <DocumentsPage
        key={DRIVER_PROFILE_VIEWS.DOCUMENTS}
        onBack={() => setCurrentView(DRIVER_PROFILE_VIEWS.MAIN)} />
      }
      {currentView === DRIVER_PROFILE_VIEWS.SETTINGS &&
      <SettingsPage
        key={DRIVER_PROFILE_VIEWS.SETTINGS}
        onBack={() => setCurrentView(DRIVER_PROFILE_VIEWS.MAIN)} />
      }
    </AnimatePresence>);

}