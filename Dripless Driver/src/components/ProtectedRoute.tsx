import React from 'react';
import { Loader2 } from 'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
interface ProtectedRouteProps {
  children: React.ReactNode;
}
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useDriverAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/50 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>);

  }
  if (!isAuthenticated) {
    return null; // App.tsx will handle showing the login page
  }
  return <>{children}</>;
}