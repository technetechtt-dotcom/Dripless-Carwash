import React, { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { JobRequestModal } from './components/JobRequestModal';
import { JobRatingModal } from './components/JobRatingModal';
import { EarningsPage } from './pages/EarningsPage';
import { HomePage } from './pages/HomePage';
import { JobsPage } from './pages/JobsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EcoImpactPage } from './pages/EcoImpactPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DriverAuthProvider, useDriverAuth } from './contexts/DriverAuthContext';
import {
  DriverBookingProvider,
  useDriverBookings } from
'./contexts/DriverBookingContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DRIVER_TABS } from './utils/routes';
function AppContent() {
  const { isAuthenticated } = useDriverAuth();
  const {
    incomingJob,
    acceptJob,
    declineJob,
    jobToRate,
    submitRating,
    closeRatingModal
  } = useDriverBookings();
  const [activeTab, setActiveTab] = useState<string>(DRIVER_TABS.HOME);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  // Auth Flow
  if (!isAuthenticated) {
    return authView === 'login' ?
    <LoginPage onNavigateToSignup={() => setAuthView('signup')} /> :

    <SignupPage onNavigateToLogin={() => setAuthView('login')} />;

  }
  const renderPage = () => {
    switch (activeTab) {
      case DRIVER_TABS.HOME:
        return <HomePage />;
      case DRIVER_TABS.JOBS:
        return <JobsPage />;
      case DRIVER_TABS.IMPACT:
        return <EcoImpactPage />;
      case DRIVER_TABS.EARNINGS:
        return <EarningsPage />;
      case DRIVER_TABS.PROFILE:
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30 text-slate-900 dark:text-slate-50 font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      <div className="max-w-md mx-auto bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm min-h-screen relative shadow-2xl shadow-black/5 overflow-hidden border-x border-white/50 dark:border-slate-800/50">
        <ProtectedRoute>
          {renderPage()}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

          <JobRequestModal
            isOpen={!!incomingJob}
            job={incomingJob}
            onAccept={acceptJob}
            onDecline={declineJob} />


          <JobRatingModal
            isOpen={!!jobToRate}
            job={jobToRate}
            onClose={closeRatingModal}
            onSubmitRating={submitRating} />

        </ProtectedRoute>
      </div>
    </div>);

}
export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DriverAuthProvider>
          <DriverBookingProvider>
            <AppContent />
          </DriverBookingProvider>
        </DriverAuthProvider>
      </ToastProvider>
    </ThemeProvider>);

}