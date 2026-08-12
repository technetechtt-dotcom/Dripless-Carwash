import { Navigate } from 'react-router-dom';
import { getDashboardTabPath } from './navigation';

/** Legacy notifications route → Inbox */
export const NotificationsRoutePage = () => (
  <Navigate to={getDashboardTabPath('inbox')} replace />
);
