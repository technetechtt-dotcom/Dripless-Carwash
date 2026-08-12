import { OPS_ADMIN_ROUTES } from '@shared/routes';

export type DashboardTab =
  | 'overview'
  | 'dispatch'
  | 'bookings'
  | 'incidents'
  | 'drivers'
  | 'customers'
  | 'inbox'
  | 'communications'
  | 'specials'
  | 'reports'
  | 'audit';

export type OpsPreset = 'super_admin' | 'dispatcher' | 'support' | 'compliance';

export type NavGroupId = 'command' | 'operations' | 'people' | 'communication' | 'business' | 'system';

export type OpsNavItem = {
  key: DashboardTab;
  label: string;
  subtitle: string;
  group: NavGroupId;
  /** Permission keys required to see this nav item. Empty = always show when authenticated. */
  permissionsAny?: string[];
  icon: OpsNavIconId;
  badgeKey?: 'dispatch' | 'incidents' | 'inbox' | 'unassigned';
};

export type OpsNavIconId =
  | 'gauge'
  | 'dispatch'
  | 'jobs'
  | 'alert'
  | 'drivers'
  | 'customers'
  | 'inbox'
  | 'broadcast'
  | 'promo'
  | 'reports'
  | 'audit';

export const navGroups: Array<{ id: NavGroupId; label: string }> = [
  { id: 'command', label: 'Command' },
  { id: 'operations', label: 'Operations' },
  { id: 'people', label: 'People' },
  { id: 'communication', label: 'Communication' },
  { id: 'business', label: 'Business' },
  { id: 'system', label: 'System' }
];

export const dashboardTabs: OpsNavItem[] = [
  {
    key: 'overview',
    label: 'Command Centre',
    subtitle: 'Live health, priority queue, and next actions',
    group: 'command',
    icon: 'gauge'
  },
  {
    key: 'dispatch',
    label: 'Dispatch',
    subtitle: 'Action queue, map, assignment, and settings',
    group: 'operations',
    permissionsAny: ['bookings:read', 'incidents:read'],
    icon: 'dispatch',
    badgeKey: 'dispatch'
  },
  {
    key: 'bookings',
    label: 'Jobs',
    subtitle: 'Search, assign, and manage bookings safely',
    group: 'operations',
    permissionsAny: ['bookings:read'],
    icon: 'jobs'
  },
  {
    key: 'incidents',
    label: 'Incidents',
    subtitle: 'Ownership, SLA ageing, and resolution',
    group: 'operations',
    permissionsAny: ['incidents:read'],
    icon: 'alert',
    badgeKey: 'incidents'
  },
  {
    key: 'drivers',
    label: 'Drivers',
    subtitle: 'Verification, status, and availability',
    group: 'people',
    permissionsAny: ['drivers:read'],
    icon: 'drivers'
  },
  {
    key: 'customers',
    label: 'Customers',
    subtitle: 'Profiles, moderation, and support context',
    group: 'people',
    permissionsAny: ['customers:read'],
    icon: 'customers'
  },
  {
    key: 'inbox',
    label: 'Inbox',
    subtitle: 'Alerts, assigned incidents, ops messages',
    group: 'communication',
    icon: 'inbox',
    badgeKey: 'inbox'
  },
  {
    key: 'communications',
    label: 'Broadcasts',
    subtitle: 'Create and send customer/driver messages',
    group: 'communication',
    permissionsAny: ['notifications:broadcast'],
    icon: 'broadcast'
  },
  {
    key: 'specials',
    label: 'Promotions',
    subtitle: 'Campaigns, promo codes, and activations',
    group: 'business',
    permissionsAny: ['specials:manage'],
    icon: 'promo'
  },
  {
    key: 'reports',
    label: 'Reports',
    subtitle: 'Completion, revenue, and service performance',
    group: 'business',
    permissionsAny: ['activity:read', 'bookings:read'],
    icon: 'reports'
  },
  {
    key: 'audit',
    label: 'Audit log',
    subtitle: 'Who changed what, when, and why',
    group: 'system',
    permissionsAny: ['activity:read'],
    icon: 'audit'
  }
];

export const getDashboardTabPath = (tab: DashboardTab) => OPS_ADMIN_ROUTES.DASHBOARD_PAGE(tab);

export const getTabMeta = (tab: DashboardTab) =>
  dashboardTabs.find((item) => item.key === tab) ?? dashboardTabs[0];

export const tabRequiresAnyPermission = (
  tab: OpsNavItem,
  permissions: string[]
): boolean => {
  if (!tab.permissionsAny?.length) return true;
  return tab.permissionsAny.some((p) => permissions.includes(p));
};

export const filterTabsForPermissions = (permissions: string[]): OpsNavItem[] =>
  dashboardTabs.filter((tab) => tabRequiresAnyPermission(tab, permissions));

export const presetLandingTab: Record<OpsPreset, DashboardTab> = {
  super_admin: 'overview',
  dispatcher: 'dispatch',
  support: 'inbox',
  compliance: 'drivers'
};

export const presetLabel: Record<OpsPreset, string> = {
  super_admin: 'Super Admin',
  dispatcher: 'Dispatcher',
  support: 'Support',
  compliance: 'Compliance'
};

export const presetBlurb: Record<OpsPreset, string> = {
  super_admin: 'Full layout and shortcuts. Permissions still control access.',
  dispatcher: 'Lands on Dispatch with job-first focus.',
  support: 'Lands on Inbox for customer/incident work.',
  compliance: 'Lands on Drivers for verification queues.'
};
