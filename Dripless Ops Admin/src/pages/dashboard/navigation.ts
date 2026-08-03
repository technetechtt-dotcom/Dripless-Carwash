import { OPS_ADMIN_ROUTES } from '@shared/routes';

export type DashboardTab =
  | 'overview'
  | 'customers'
  | 'drivers'
  | 'bookings'
  | 'dispatch'
  | 'notifications'
  | 'specials';

export type OpsPreset = 'super_admin' | 'dispatcher' | 'support' | 'compliance';

export const dashboardTabs: Array<{
  key: DashboardTab;
  label: string;
  subtitle: string;
}> = [
  { key: 'overview', label: 'Overview', subtitle: 'System status, analytics, and broadcast' },
  { key: 'dispatch', label: 'Dispatch', subtitle: 'Live lanes, SLA alerts, and incident control' },
  { key: 'bookings', label: 'Bookings', subtitle: 'Search, edit, assign, and bulk-manage bookings' },
  { key: 'specials', label: 'Specials', subtitle: 'Create, approve, and activate campaigns' },
  { key: 'customers', label: 'Customers', subtitle: 'Customer profiles and account moderation' },
  { key: 'drivers', label: 'Drivers', subtitle: 'Driver status, verification, and availability' },
  { key: 'notifications', label: 'Notifications', subtitle: 'Ops messages and activity log' }
];

export const getDashboardTabPath = (tab: DashboardTab) => OPS_ADMIN_ROUTES.DASHBOARD_PAGE(tab);
