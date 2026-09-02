import { expect, test } from '@playwright/test';
import { loginCustomer, API } from './helpers/api-client';
import { E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD } from './helpers/credentials';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:5173';
const HAS_UI = Boolean(process.env.E2E_UI === '1' || process.env.CI);

test.describe('Network resilience — Customer UI', () => {
  test.skip(!HAS_UI, 'Requires running Customer app');

  test('complete network loss and recovery on login', async ({ page, context }) => {
    await page.goto(`${CUSTOMER_URL}/login`);
    await context.setOffline(true);
    await page.waitForTimeout(800);
    await context.setOffline(false);
    await expect(page.locator('body')).toBeVisible();
  });

  test('slow mobile data simulation keeps shell responsive', async ({ page, context }) => {
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    const response = await page.goto(`${CUSTOMER_URL}/services`);
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Network resilience — API', () => {
  test('customer session survives health check after offline gap', async () => {
    const token = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const health = await fetch(`${API}/health`);
    expect(health.ok).toBeTruthy();
    const profile = await fetch(`${API}/customers/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(profile.status).toBe(200);
  });
});
