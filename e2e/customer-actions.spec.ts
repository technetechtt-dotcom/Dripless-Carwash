import { expect, test } from '@playwright/test';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:5173';
const HAS_UI = Boolean(process.env.E2E_UI === '1' || process.env.CI);

test.describe('Customer critical UI actions', () => {
  test.skip(!HAS_UI, 'Set E2E_UI=1 with running Customer app to execute UI actions');

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/this-route-does-not-exist`);
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /go to home/i })).toBeVisible();
  });

  test('help support shows Dripless contact email', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/help-support`);
    await expect(page.getByText('support@dripless.app')).toBeVisible();
    await expect(page.getByText('support@ecoservices.com')).toHaveCount(0);
    await expect(page.getByText('+1 (555) 123-4567')).toHaveCount(0);
  });

  test('payment methods copy uses Ozow not Paystack', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/payment-methods`);
    await expect(page.getByText(/ozow/i).first()).toBeVisible();
    await expect(page.getByText(/paystack/i)).toHaveCount(0);
  });

  test('vouchers page has redeem but no gift send', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/vouchers`);
    await expect(page.getByRole('button', { name: /redeem/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /send gift/i })).toHaveCount(0);
    await expect(page.getByText('$15')).toHaveCount(0);
    await expect(page.getByText('$25')).toHaveCount(0);
  });

  test('tracking without booking id shows selection error', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/tracking`);
    await expect(page.getByText(/no booking was selected/i)).toBeVisible();
  });

  test('legacy taxi and delivery routes redirect away from booking', async ({ page }) => {
    for (const route of ['/book-ride', '/ride-details', '/delivery-details', '/booking/taxi', '/booking/delivery']) {
      await page.goto(`${CUSTOMER_URL}${route}`);
      await expect(page).not.toHaveURL(new RegExp(`${route}$`));
    }
  });

  test('login survives offline/online toggles', async ({ page, context }) => {
    await page.goto(`${CUSTOMER_URL}/login`);
    await expect(page.locator('body')).toBeVisible();
    await context.setOffline(true);
    await page.waitForTimeout(400);
    await context.setOffline(false);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|sign in|continue/i }).first()).toBeVisible();
  });

  test('primary public actions remain clickable on login/signup', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/login`);
    await expect(page.locator('form, [data-testid="login-form"], button').first()).toBeVisible();
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i }).first();
    if (await signupLink.count()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
    await page.goto(`${CUSTOMER_URL}/signup`);
    await expect(page.locator('body')).toBeVisible();
  });
});
