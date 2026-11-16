import { expect, test } from '@playwright/test';
import { api, loginCustomer, API } from './helpers/api-client';
import { E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD } from './helpers/credentials';

test.describe('Customer acceptance — API coverage', () => {
  test('signup and login flow', async () => {
    const suffix = `${Date.now().toString(36)}`;
    const email = `e2e_accept_${suffix}@test.dripless.local`;
    const signup = await api<{ session: { tokens: { accessToken: string } } }>(
      '/auth/customer/signup',
      'POST',
      { name: 'Acceptance Customer', email, password: 'SecurePass123!' }
    );
    expect(signup.session.tokens.accessToken).toBeTruthy();
    const login = await api<{ session: { tokens: { accessToken: string } } }>(
      '/auth/customer/login',
      'POST',
      { email, password: 'SecurePass123!' }
    );
    expect(login.session.tokens.accessToken).toBeTruthy();
  });

  test('password reset, profile, vehicles, addresses, wallet, referrals', async () => {
    const token = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const reset = await api<{ message: string }>('/auth/password-reset/request', 'POST', {
      email: E2E_CUSTOMER_EMAIL
    });
    expect(reset.message).toBeTruthy();

    const profile = await api<Record<string, unknown>>('/customers/me', 'GET', undefined, token);
    expect(profile.id).toBeTruthy();

    const vehicles = await api('/customers/me/vehicles', 'GET', undefined, token);
    expect(Array.isArray(vehicles)).toBeTruthy();

    const addresses = await api('/customers/me/addresses', 'GET', undefined, token);
    expect(Array.isArray(addresses)).toBeTruthy();

    const wallet = await api('/wallet', 'GET', undefined, token);
    expect(wallet).toBeTruthy();

    const referrals = await api<{ referralCode: string | null; invitesCount: number }>(
      '/customers/me/referrals/summary',
      'GET',
      undefined,
      token
    );
    expect(typeof referrals.invitesCount).toBe('number');
  });

  test('catalog, impact, notifications, bookings, privacy', async () => {
    const token = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const catalog = await api<Array<{ slug: string }>>('/catalog/services', 'GET', undefined, token);
    expect(catalog.every((s) => s.slug !== 'taxi' && s.slug !== 'delivery')).toBeTruthy();

    const impact = await api('/impact/summary', 'GET', undefined, token);
    expect(impact).toBeTruthy();

    const trends = await api('/impact/trends', 'GET', undefined, token);
    expect(Array.isArray((trends as { months: unknown[] }).months)).toBeTruthy();

    const notifications = await api('/notifications?role=customer', 'GET', undefined, token);
    expect(Array.isArray(notifications)).toBeTruthy();

    const bookings = await api('/bookings', 'GET', undefined, token);
    expect(Array.isArray(bookings)).toBeTruthy();

    const privacy = await fetch(`${API}/privacy/requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(privacy.status).toBeLessThan(500);
  });
});
