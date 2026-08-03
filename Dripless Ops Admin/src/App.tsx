import { Navigate, Route, Routes } from 'react-router-dom';
import { OPS_ADMIN_ROUTES } from '@shared/routes';
import { LoginPage } from './pages/LoginPage';
import { useOpsAuth } from './contexts/OpsAuthContext';
import {
  dashboardTabs,
  getDashboardTabPath
} from './pages/dashboard/navigation';
import { OverviewRoutePage } from './pages/dashboard/OverviewRoutePage';
import { DispatchRoutePage } from './pages/dashboard/DispatchRoutePage';
import { BookingsRoutePage } from './pages/dashboard/BookingsRoutePage';
import { CustomersRoutePage } from './pages/dashboard/CustomersRoutePage';
import { DriversRoutePage } from './pages/dashboard/DriversRoutePage';
import { NotificationsRoutePage } from './pages/dashboard/NotificationsRoutePage';
import { SpecialsRoutePage } from './pages/dashboard/SpecialsRoutePage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useOpsAuth();
  if (isLoading) return <div className="container">Loading...</div>;
  if (!isAuthenticated) return <Navigate to={OPS_ADMIN_ROUTES.LOGIN} replace />;
  return children;
};

const pageByTab = {
  overview: <OverviewRoutePage />,
  dispatch: <DispatchRoutePage />,
  bookings: <BookingsRoutePage />,
  specials: <SpecialsRoutePage />,
  customers: <CustomersRoutePage />,
  drivers: <DriversRoutePage />,
  notifications: <NotificationsRoutePage />
} as const;

export const App = () => {
  const { isAuthenticated } = useOpsAuth();

  return (
    <Routes>
      <Route
        path={OPS_ADMIN_ROUTES.LOGIN}
        element={
          isAuthenticated ?
          <Navigate to={getDashboardTabPath('overview')} replace /> :
          <LoginPage />
        }
      />
      <Route
        path={OPS_ADMIN_ROUTES.DASHBOARD}
        element={<Navigate to={getDashboardTabPath('overview')} replace />}
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
