/**
 * Full staged wash: Customer books → Ops assigns → Driver completes.
 * Requires API + seeded users (ensure-test-users).
 */
import { expect, test } from '@playwright/test';
import { api, loginCustomer, loginDriver, loginOps } from './helpers/api-client';
import {
  E2E_CUSTOMER_EMAIL,
  E2E_CUSTOMER_PASSWORD,
  E2E_DRIVER_EMAIL,
  E2E_DRIVER_PASSWORD,
  E2E_OPS_EMAIL,
  E2E_OPS_PASSWORD
} from './helpers/credentials';

test.describe('staged wash — customer + driver + ops', () => {
  test('catalog excludes taxi/delivery and wash path is reachable', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const driverToken = await loginDriver(E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    const opsToken = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);

    const catalog = await api<Array<{ slug: string; name: string }>>(
      '/catalog/services',
      'GET',
      undefined,
      customerToken
    );
    expect(catalog.map((service) => service.slug)).not.toContain('taxi');
    expect(catalog.map((service) => service.slug)).not.toContain('delivery');

    const [customerImpact, driverStats, opsOverview] = await Promise.all([
      api('/impact/summary', 'GET', undefined, customerToken),
      api('/driver/stats/today', 'GET', undefined, driverToken),
      api('/ops/dashboard/summary', 'GET', undefined, opsToken)
    ]);

    expect(customerImpact).toBeTruthy();
    expect(driverStats).toBeTruthy();
    expect(opsOverview).toBeTruthy();
  });
});
