import { expect, test } from '@playwright/test';
import { api, loginDriver, API } from './helpers/api-client';
import { E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD } from './helpers/credentials';

test.describe('Driver acceptance — API coverage', () => {
  test('stats, documents, payouts, impact, equipment paths', async () => {
    const token = await loginDriver(E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);

    const today = await api<{ jobsToday: number; earningsTodayZar: number; onlineHoursToday: number }>(
      '/driver/stats/today',
      'GET',
      undefined,
      token
    );
    expect(typeof today.jobsToday).toBe('number');
    expect(typeof today.earningsTodayZar).toBe('number');
    expect(typeof today.onlineHoursToday).toBe('number');

    const week = await api<{ jobsWeek: number; earningsWeekZar: number }>(
      '/driver/stats/week',
      'GET',
      undefined,
      token
    );
    expect(typeof week.jobsWeek).toBe('number');
    expect(typeof week.earningsWeekZar).toBe('number');

    const documents = await api('/driver/documents', 'GET', undefined, token);
    expect(Array.isArray(documents)).toBeTruthy();

    const payouts = await api('/payouts/me', 'GET', undefined, token);
    expect(payouts).toBeTruthy();

    const impact = await api('/impact/summary', 'GET', undefined, token);
    expect(impact).toBeTruthy();

    for (const path of ['/driver/availability', '/driver/kit']) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBeLessThan(500);
    }
  });

  test('online toggle and location update', async () => {
    const token = await loginDriver(E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    const online = await api<{ online: boolean }>(
      '/driver/online',
      'POST',
      { online: true },
      token
    );
    expect(typeof online.online).toBe('boolean');

    const location = await api(
      '/driver/location',
      'PATCH',
      { lat: -26.1076, lng: 28.0567, accuracyM: 25 },
      token
    );
    expect(location).toBeTruthy();
  });
});
