import { describe, expect, it } from 'vitest';
import {
  dashboardTabs,
  filterTabsForPermissions,
  getDashboardTabPath,
  presetLandingTab
} from './navigation';

const expectedPages = [
  'overview',
  'dispatch',
  'bookings',
  'incidents',
  'drivers',
  'customers',
  'inbox',
  'communications',
  'specials',
  'finance',
  'reports',
  'audit'
] as const;

describe('ops dashboard navigation', () => {
  it('defines a dedicated menu page for every sidebar item', () => {
    const keys = dashboardTabs.map((tab) => tab.key);
    expect(keys).toEqual([...expectedPages]);
    for (const key of expectedPages) {
      expect(getDashboardTabPath(key)).toBe(`/dashboard/${key}`);
    }
  });

  it('contains dispatch tab metadata', () => {
    const dispatchTab = dashboardTabs.find((tab) => tab.key === 'dispatch');
    expect(dispatchTab).toBeTruthy();
    expect(dispatchTab?.label).toBe('Dispatch');
  });

  it('builds dashboard tab paths', () => {
    expect(getDashboardTabPath('overview')).toBe('/dashboard/overview');
    expect(getDashboardTabPath('dispatch')).toBe('/dashboard/dispatch');
    expect(getDashboardTabPath('specials')).toBe('/dashboard/specials');
    expect(getDashboardTabPath('incidents')).toBe('/dashboard/incidents');
    expect(getDashboardTabPath('inbox')).toBe('/dashboard/inbox');
    expect(getDashboardTabPath('audit')).toBe('/dashboard/audit');
  });

  it('filters navigation by permissions', () => {
    const supportOnly = filterTabsForPermissions(['bookings:read', 'customers:read']);
    const keys = supportOnly.map((t) => t.key);
    expect(keys).toContain('overview');
    expect(keys).toContain('bookings');
    expect(keys).toContain('customers');
    expect(keys).toContain('inbox');
    expect(keys).not.toContain('specials');
    expect(keys).not.toContain('drivers');
  });

  it('maps workspace presets to landing tabs', () => {
    expect(presetLandingTab.dispatcher).toBe('dispatch');
    expect(presetLandingTab.support).toBe('inbox');
    expect(presetLandingTab.compliance).toBe('drivers');
  });
});
