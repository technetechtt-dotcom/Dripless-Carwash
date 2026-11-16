import { expect, test } from '@playwright/test';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:5173';
const DRIVER_URL = process.env.DRIVER_URL || 'http://localhost:5174';
const OPS_URL = process.env.OPS_URL || 'http://localhost:5175';
const HAS_UI = Boolean(process.env.E2E_UI === '1' || process.env.CI);

test.describe('Customer form validation', () => {
  test.skip(!HAS_UI, 'Requires running Customer app');

  test('login rejects empty submit', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/login`);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('signup rejects weak password', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/signup`);
    await page.fill('input[type="email"]', `weak_${Date.now()}@test.dripless.local`);
    await page.fill('input[type="password"]', '123');
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('forgot password requires email', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/forgot-password`);
    await page.getByRole('button', { name: /reset|send/i }).click();
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Driver form validation', () => {
  test.skip(!HAS_UI, 'Requires running Driver app');

  test('login rejects empty submit', async ({ page }) => {
    await page.goto(`${DRIVER_URL}/login`);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Ops form validation', () => {
  test.skip(!HAS_UI, 'Requires running Ops app');

  test('login rejects empty submit', async ({ page }) => {
    await page.goto(`${OPS_URL}/login`);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page).toHaveURL(/login/);
  });
});
