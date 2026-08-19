import { Navigate, Route, Routes } from 'react-router-dom';
import { OPS_ADMIN_ROUTES } from '@shared/routes';
import { LoginPage } from './pages/LoginPage';
import { useOpsAuth } from './contexts/OpsAuthContext';
import {
  dashboardTabs,
  getDashboardTabPath,
  type DashboardTab
} from './pages/dashboard/navigation';
import { OverviewRoutePage } from './pages/dashboard/OverviewRoutePage';
import { DispatchRoutePage } from './pages/dashboard/DispatchRoutePage';
import { BookingsRoutePage } from './pages/dashboard/BookingsRoutePage';
import { CustomersRoutePage } from './pages/dashboard/CustomersRoutePage';
import { DriversRoutePage } from './pages/dashboard/DriversRoutePage';
import { SpecialsRoutePage } from './pages/dashboard/SpecialsRoutePage';
import { IncidentsRoutePage } from './pages/dashboard/IncidentsRoutePage';
import { InboxRoutePage } from './pages/dashboard/InboxRoutePage';
import { CommunicationsRoutePage } from './pages/dashboard/CommunicationsRoutePage';
import { AuditRoutePage } from './pages/dashboard/AuditRoutePage';
import { ReportsRoutePage } from './pages/dashboard/ReportsRoutePage';
import { FinanceRoutePage } from './pages/dashboard/FinanceRoutePage';
import { MfaEnrollmentPage } from './pages/MfaEnrollmentPage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { admin, isAuthenticated, isLoading } = useOpsAuth();
  if (isLoading) return <div className="container">Loading...</div>;
  if (!isAuthenticated) return <Navigate to={OPS_ADMIN_ROUTES.LOGIN} replace />;
  if (admin?.mfaEnrollmentRequired) return <MfaEnrollmentPage />;
  return children;
};

const pageByTab: Record<DashboardTab, JSX.Element> = {
  overview: <OverviewRoutePage />,
  dispatch: <DispatchRoutePage />,
  bookings: <BookingsRoutePage />,
  incidents: <IncidentsRoutePage />,
  drivers: <DriversRoutePage />,
  customers: <CustomersRoutePage />,
  inbox: <InboxRoutePage />,
  communications: <CommunicationsRoutePage />,
  specials: <SpecialsRoutePage />,
  finance: <FinanceRoutePage />,
  reports: <ReportsRoutePage />,
  audit: <AuditRoutePage />
};

export const App = () => {
  const { isAuthenticated } = useOpsAuth();

  return (
    <Routes>
      <Route
        path={OPS_ADMIN_ROUTES.LOGIN}
        element={
          isAuthenticated ?
            <Navigate to={getDashboardTabPath('overview')} replace />
          : <LoginPage />
        }
      />
      <Route
        path={OPS_ADMIN_ROUTES.DASHBOARD}
        element={<Navigate to={getDashboardTabPath('overview')} replace />}
      />
      {/* Legacy notifications path → inbox */}
      <Route
        path="/dashboard/notifications"
        element={<Navigate to={getDashboardTabPath('inbox')} replace />}
      />
      {dashboardTabs.map((tab) => (
        <Route
          key={tab.key}
          path={getDashboardTabPath(tab.key)}
          element={<ProtectedRoute>{pageByTab[tab.key]}</ProtectedRoute>}
        />
      ))}
      <Route
        path="*"
        element={<Navigate to={getDashboardTabPath('overview')} replace />}
      />
    </Routes>
  );
};
