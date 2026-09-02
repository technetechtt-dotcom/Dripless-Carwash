import { expect, test } from '@playwright/test';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:5173';
const DRIVER_URL = process.env.DRIVER_URL || 'http://localhost:5174';
const OPS_URL = process.env.OPS_URL || 'http://localhost:5175';
const HAS_UI = Boolean(process.env.E2E_UI === '1' || process.env.CI);

const customerRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/services',
  '/help-center',
  '/help-support'
];

const driverRoutes = ['/login', '/signup'];

test.describe('Customer page matrix', () => {
  test.skip(!HAS_UI, 'Set E2E_UI=1 with running apps to execute UI matrix');

  for (const route of customerRoutes) {
    test(`route loads ${route}`, async ({ page }) => {
      const response = await page.goto(`${CUSTOMER_URL}${route}`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('invalid booking route shows app shell without crash', async ({ page }) => {
    const response = await page.goto(`${CUSTOMER_URL}/booking/not-a-real-service`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('network loss recovery on login page', async ({ page, context }) => {
    await page.goto(`${CUSTOMER_URL}/login`);
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Driver tab matrix', () => {
  test.skip(!HAS_UI, 'Set E2E_UI=1 with running apps to execute UI matrix');

  for (const route of driverRoutes) {
    test(`route loads ${route}`, async ({ page }) => {
      const response = await page.goto(`${DRIVER_URL}${route}`);
      expect(response?.status()).toBeLessThan(500);
    });
  }
});

test.describe('Ops section matrix', () => {
  test.skip(!HAS_UI, 'Set E2E_UI=1 with running apps to execute UI matrix');

  test('login page loads', async ({ page }) => {
    const response = await page.goto(`${OPS_URL}/login`);
    expect(response?.status()).toBeLessThan(500);
  });
});
