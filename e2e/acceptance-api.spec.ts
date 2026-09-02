import { expect, test } from '@playwright/test';
import { api, loginCustomer, loginDriver, loginOps, API } from './helpers/api-client';
import {
  E2E_CUSTOMER_EMAIL,
  E2E_CUSTOMER_PASSWORD,
  E2E_DRIVER_EMAIL,
  E2E_DRIVER_PASSWORD,
  E2E_OPS_EMAIL,
  E2E_OPS_PASSWORD
} from './helpers/credentials';

test.describe('Customer API acceptance', () => {
  test('auth, impact, catalog, notifications, wallet', async () => {
    const token = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const impact = await api<{
      co2KgSaved: number;
      ecoStreakDays: number;
      projectedCo2KgYear: number;
    }>('/impact/summary', 'GET', undefined, token);
    expect(typeof impact.co2KgSaved).toBe('number');
    expect(typeof impact.ecoStreakDays).toBe('number');

    const catalog = await api<Array<{ slug: string }>>('/catalog/services', 'GET', undefined, token);
    expect(Array.isArray(catalog)).toBeTruthy();
    expect(catalog.some((service) => service.slug === 'car-wash')).toBeTruthy();
    expect(catalog.every((service) => service.slug !== 'taxi' && service.slug !== 'delivery')).toBeTruthy();

    const profile = await api('/customers/me', 'GET', undefined, token);
    expect(profile).toBeTruthy();

    const notifications = await api<Array<{ read: boolean }>>(
      '/notifications?role=customer',
      'GET',
      undefined,
      token
    );
    expect(Array.isArray(notifications)).toBeTruthy();

    const wallet = await api('/wallet', 'GET', undefined, token);
    expect(wallet).toBeTruthy();
  });

  test('password reset request accepts email', async () => {
    const result = await api<{ message: string }>('/auth/password-reset/request', 'POST', {
      email: E2E_CUSTOMER_EMAIL
    });
    expect(result.message).toBeTruthy();
  });
});

test.describe('Driver API acceptance', () => {
  test('stats, payouts, online prerequisites', async () => {
    const token = await loginDriver(E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    const stats = await api<{
      jobsToday: number;
      onlineHoursToday: number;
    }>('/driver/stats/today', 'GET', undefined, token);
    expect(typeof stats.jobsToday).toBe('number');
    expect(typeof stats.onlineHoursToday).toBe('number');

    const payouts = await api('/payouts/me', 'GET', undefined, token);
    expect(payouts).toBeTruthy();

    const documents = await api('/driver/documents', 'GET', undefined, token);
    expect(Array.isArray(documents)).toBeTruthy();
  });
});

test.describe('Ops RBAC acceptance', () => {
  test('ops admin can reach command sections', async () => {
    const token = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);
    for (const path of [
      '/ops/dashboard/summary',
      '/ops/bookings',
      '/ops/drivers',
      '/ops/customers',
      '/ops/incidents',
      '/ops/notifications',
      '/ops/specials',
      '/ops/finance/payments',
      '/ops/activity'
    ]) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBeLessThan(500);
    }
  });
});
