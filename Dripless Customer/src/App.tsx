import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2Icon } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { BookingProvider } from './contexts/BookingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { PageSkeleton } from './components/SkeletonLoader';
// Eager loaded pages
import Splash from './pages/Splash';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
// Lazy loaded pages
const Services = lazy(() => import('./pages/Services'));
const BookRide = lazy(() => import('./pages/BookRide'));
const ServiceBooking = lazy(() => import('./pages/ServiceBooking'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Profile = lazy(() => import('./pages/Profile'));
const ServiceHistory = lazy(() => import('./pages/ServiceHistory'));
const WalletManagement = lazy(() => import('./pages/WalletManagement'));
const PersonalInformation = lazy(() => import('./pages/PersonalInformation'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const Notifications = lazy(() => import('./pages/Notifications'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const DriplessFeatures = lazy(() => import('./pages/DriplessFeatures'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const Feedback = lazy(() => import('./pages/Feedback'));
const MyCars = lazy(() => import('./pages/MyCars'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const RateService = lazy(() => import('./pages/RateService'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Security = lazy(() => import('./pages/Security'));
const Receipts = lazy(() => import('./pages/Receipts'));
const SavedAddresses = lazy(() => import('./pages/SavedAddresses'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const LoadingFallback = () =>
<div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
    <Loader2Icon className="h-8 w-8 animate-spin text-eco-500 mb-2" />
    <p className="text-slate-500 dark:text-slate-400 text-sm">Loading...</p>
  </div>;

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BookingProvider>
            <Router>
              <Toaster position="top-center" richColors />
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Splash />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route path="/home" element={<Home />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/book-ride" element={<BookRide />} />
                      <Route
                        path="/booking/:service"
                        element={<ServiceBooking />} />

                      <Route
                        path="/booking-confirmation"
                        element={<BookingConfirmation />} />

                      <Route path="/ride-details" element={<Navigate to="/services" replace />} />
                      <Route path="/delivery-details" element={<Navigate to="/services" replace />} />

                      <Route path="/tracking" element={<Tracking />} />
                      <Route path="/rewards" element={<Rewards />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route
                        path="/service-history"
                        element={<ServiceHistory />} />

                      <Route
                        path="/service-details"
                        element={<ServiceDetails />} />

                      <Route
                        path="/wallet-management"
                        element={<WalletManagement />} />

                      <Route
                        path="/personal-information"
                        element={<PersonalInformation />} />

                      <Route
                        path="/payment-methods"
                        element={<PaymentMethods />} />

                      <Route
                        path="/notifications"
                        element={<Notifications />} />

                      <Route path="/help-support" element={<HelpSupport />} />
                      <Route
                        path="/privacy-policy"
                        element={<PrivacyPolicy />} />

                      <Route path="/help-center" element={<HelpCenter />} />
                      <Route
                        path="/dripless-features"
                        element={<DriplessFeatures />} />

                      <Route
                        path="/terms-conditions"
                        element={<TermsConditions />} />

                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/my-cars" element={<MyCars />} />
                      <Route path="/vouchers" element={<Vouchers />} />
                      <Route path="/rate-service" element={<RateService />} />
                      <Route path="/referrals" element={<Referrals />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/receipts" element={<Receipts />} />
                      <Route path="/saved-addresses" element={<SavedAddresses />} />
                      <Route path="/payment-return" element={<PaymentReturn />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </BookingProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>);

}
