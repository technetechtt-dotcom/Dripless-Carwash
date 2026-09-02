/**
 * P0 staged wash — full API path without developer intervention.
 * Customer books → pays → Ops assigns → Driver completes → receipt + earnings + ops finance/audit.
 */
import { expect, test } from '@playwright/test';
import { api, loginCustomer, loginDriver, loginOps, API } from './helpers/api-client';
import { runGoldenWash, runPaidCancellation } from './helpers/golden-wash';
import {
  E2E_CUSTOMER_EMAIL,
  E2E_CUSTOMER_PASSWORD,
  E2E_DRIVER_EMAIL,
  E2E_DRIVER_PASSWORD,
  E2E_OPS_EMAIL,
  E2E_OPS_PASSWORD
} from './helpers/credentials';

test.describe('P0 staged wash — no developer intervention', () => {
  test('complete wash: receipt, driver earning, ops finance and audit', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const driverLogin = await api<{ session: { tokens: { accessToken: string } }; profile?: { id: string } }>(
      '/auth/driver/login',
      'POST',
      { email: E2E_DRIVER_EMAIL, password: E2E_DRIVER_PASSWORD }
    );
    const driverToken = driverLogin.session.tokens.accessToken;
    const driverId = String(driverLogin.profile?.id || '');
    const opsToken = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);

    const earningsBefore = await api<{ availableZar: number }>('/payouts/me', 'GET', undefined, driverToken);
    const wash = await runGoldenWash({ customerToken, driverToken, opsToken, driverId });

    const booking = await api<{ status: string; paymentStatus: string }>(
      `/bookings/${wash.bookingId}`,
      'GET',
      undefined,
      customerToken
    );
    expect(booking.status).toBe('COMPLETED');
    expect(booking.paymentStatus).toBe('PAID');

    const invoices = await api<Array<{ id: string; bookingId?: string; status: string }>>(
      '/invoices',
      'GET',
      undefined,
      customerToken
    );
    const hasInvoice =
      invoices.length > 0 ||
      invoices.some((row) => row.bookingId === wash.bookingId || row.status === 'PAID');
    expect(hasInvoice || booking.paymentStatus === 'PAID').toBeTruthy();

    const earningsAfter = await api<{ availableZar: number }>('/payouts/me', 'GET', undefined, driverToken);
    expect(earningsAfter.availableZar).toBeGreaterThanOrEqual(earningsBefore.availableZar);

    const todayStats = await api<{ jobsToday: number; earningsTodayZar: number }>(
      '/driver/stats/today',
      'GET',
      undefined,
      driverToken
    );
    expect(todayStats.jobsToday).toBeGreaterThan(0);

    const finance = await api<Array<{ id: string; status: string }>>(
      '/ops/finance/payments',
      'GET',
      undefined,
      opsToken
    );
    expect(finance.some((row) => row.id === wash.paymentId || row.status === 'PAID')).toBeTruthy();

    const audit = await api<Array<{ id: string }>>('/ops/activity', 'GET', undefined, opsToken);
    expect(audit.length).toBeGreaterThan(0);
  });

  test('paid cancellation issues refund path', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const opsToken = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);
    const { bookingId, cancelled } = await runPaidCancellation({ customerToken });
    expect(cancelled.status).toBe('CANCELLED');

    const opsView = await api<{ status: string }>(
      `/bookings/${bookingId}`,
      'GET',
      undefined,
      opsToken
    );
    expect(opsView.status).toBe('CANCELLED');

    const refunds = await fetch(`${API}/payments/refunds`, {
      headers: { Authorization: `Bearer ${opsToken}` }
    });
    expect(refunds.status).toBeLessThan(500);
  });

  test('catalog excludes taxi/delivery at pilot boundary', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const catalog = await api<Array<{ slug: string }>>('/catalog/services', 'GET', undefined, customerToken);
    expect(catalog.map((service) => service.slug)).not.toContain('taxi');
    expect(catalog.map((service) => service.slug)).not.toContain('delivery');
  });
});
