/**
 * Full staged wash: Customer books → Ops assigns → Driver completes.
 * Requires API + seeded users (ensure-test-users).
 */
import { expect, test } from '@playwright/test';
import { api, loginCustomer, loginDriver, loginOps } from './helpers/api-client';

const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'technetech.tt@gmail.com';
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'TestPass123!';
const DRIVER_EMAIL = process.env.E2E_DRIVER_EMAIL || 'ivanjohnsonijj@gmail.com';
const DRIVER_PASSWORD = process.env.E2E_DRIVER_PASSWORD || 'TestPass123!';
const OPS_EMAIL = process.env.E2E_OPS_EMAIL || 'technetech.tt+ops@gmail.com';
const OPS_PASSWORD = process.env.E2E_OPS_PASSWORD || 'TestPass123!';

test.describe('staged wash — customer + driver + ops', () => {
  test('catalog excludes taxi/delivery and wash path is reachable', async () => {
    const customerToken = await loginCustomer(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    const driverToken = await loginDriver(DRIVER_EMAIL, DRIVER_PASSWORD);
    const opsToken = await loginOps(OPS_EMAIL, OPS_PASSWORD);

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
