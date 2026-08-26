import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Moon,
  Volume2,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Smartphone } from
'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { useTheme } from '../contexts/ThemeContext';
import { notificationApi } from '@shared/api';
import { useToast } from '../contexts/ToastContext';
interface SettingsPageProps {
  onBack: () => void;
}
export function SettingsPage({ onBack }: SettingsPageProps) {
  const { logout } = useDriverAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    void notificationApi
      .preferences()
      .then((prefs) => setNotifications(prefs.pushEnabled))
      .catch(() => undefined);
  }, []);

  const setPushEnabled = (value: boolean) => {
    setNotifications(value);
    void notificationApi.updatePreferences({ pushEnabled: value }).catch((error) => {
      setNotifications(!value);
      showToast(error instanceof Error ? error.message : 'Could not save notification preference', 'error');
    });
  };
  const Toggle = ({
    checked,
    onChange



  }: {checked: boolean;onChange: (val: boolean) => void;}) =>
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
    role="switch"
    aria-checked={checked}>

      <span
      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />

    </button>;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">

          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white ml-2">
          Settings
        </h1>
      </div>

      <div className="space-y-6">
        {/* App Preferences */}
        <div className="space-y-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1">
            App Preferences
          </h3>
          <GlassCard className="overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center space-x-3">
                <Bell size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  Push Notifications
                </span>
              </div>
              <Toggle checked={notifications} onChange={setPushEnabled} />
            </div>
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center space-x-3">
                <Volume2 size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  Sound Effects
                </span>
              </div>
              <Toggle checked={sound} onChange={setSound} />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  Dark Mode
                </span>
              </div>
              <Toggle checked={isDarkMode} onChange={toggleTheme} />
            </div>
          </GlassCard>
        </div>

        {/* Support & Legal */}
        <div className="space-y-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1">
            Support
          </h3>
          <GlassCard className="overflow-hidden">
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() =>
                window.alert('Contact support@dripless.app or call +1 (555) 123-4567 for driver help.')
              }>
              <div className="flex items-center space-x-3">
                <HelpCircle size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  Help Center
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() =>
                window.alert('Privacy Policy: We protect driver identity, location history, and earnings data according to Dripless privacy standards.')
              }>
              <div className="flex items-center space-x-3">
                <Shield size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  Privacy Policy
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() =>
                window.alert('Dripless Driver App version 2.4.0')
              }>
              <div className="flex items-center space-x-3">
                <Smartphone size={20} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-200">
                  App Version
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                v2.4.0
              </span>
            </button>
          </GlassCard>
        </div>

        {/* Logout */}
        <GlassButton
          variant="danger"
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 py-4 mt-8">

          <LogOut size={20} />
          <span>Sign Out</span>
        </GlassButton>
      </div>
    </PageContainer>);

}