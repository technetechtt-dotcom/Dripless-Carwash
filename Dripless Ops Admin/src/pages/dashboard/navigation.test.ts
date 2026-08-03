import { describe, expect, it } from 'vitest';
import { dashboardTabs, getDashboardTabPath } from './navigation';

const expectedPages = [
  'overview',
  'dispatch',
  'bookings',
  'specials',
  'customers',
  'drivers',
  'notifications'
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
  });
});
