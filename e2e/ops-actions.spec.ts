import { expect, test } from '@playwright/test';
import { api, loginOps, loginCustomer, loginDriver, API } from './helpers/api-client';
import { runGoldenWash } from './helpers/golden-wash';
import {
  E2E_OPS_EMAIL,
  E2E_OPS_PASSWORD,
  E2E_OPS_DISPATCH_EMAIL,
  E2E_OPS_SUPPORT_EMAIL,
  E2E_OPS_COMPLIANCE_EMAIL,
  E2E_CUSTOMER_EMAIL,
  E2E_CUSTOMER_PASSWORD,
  E2E_DRIVER_EMAIL,
  E2E_DRIVER_PASSWORD,
  E2E_DRIVER_ID
} from './helpers/credentials';

const OPS_SECTIONS = [
  { path: '/ops/dashboard/summary', label: 'Command Centre' },
  { path: '/ops/bookings', label: 'Jobs' },
  { path: '/ops/drivers', label: 'Drivers' },
  { path: '/ops/customers', label: 'Customers' },
  { path: '/ops/incidents', label: 'Incidents' },
  { path: '/ops/settings', label: 'Platform settings' },
  { path: '/ops/specials', label: 'Promotions' },
  { path: '/ops/finance/payments', label: 'Finance' },
  { path: '/ops/activity', label: 'Audit' },
  { path: '/ops/analytics', label: 'Reports' }
];

test.describe('Ops actions and RBAC', () => {
  test('super admin reaches all ops sections', async () => {
    const token = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);
    for (const section of OPS_SECTIONS) {
      const response = await fetch(`${API}${section.path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, section.label).toBe(200);
    }
  });

  test('dispatcher can assign driver on booking', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const dispatchToken = await loginOps(E2E_OPS_DISPATCH_EMAIL, E2E_OPS_PASSWORD);
    const driverLogin = await api<{ session: { tokens: { accessToken: string } }; profile?: { id: string } }>(
      '/auth/driver/login',
      'POST',
      { email: E2E_DRIVER_EMAIL, password: E2E_DRIVER_PASSWORD }
    );
    const driverId = E2E_DRIVER_ID;

    const noon = new Date();
    noon.setDate(noon.getDate() + 1);
    noon.setHours(11, 0, 0, 0);
    const booking = await api<{ id: string }>(
      '/bookings',
      'POST',
      {
        serviceSlug: 'car-wash',
        optionSlug: 'basic',
        pickupLocation: 'Sandton City Mall',
        pickupCoordinates: { lat: -26.1076, lng: 28.0567 },
        scheduledAt: noon.toISOString(),
        vehicleSize: 'SEDAN'
      },
      customerToken
    );

    const assign = await fetch(`${API}/ops/bookings/${booking.id}/assign-driver`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${dispatchToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ driverId, reason: 'Dispatcher RBAC test' })
    });
    expect(assign.status).toBeLessThan(300);

    await api(`/bookings/${booking.id}/cancel`, 'POST', { reason: 'Dispatcher RBAC cleanup' }, customerToken);
  });

  test('support reads customers; compliance blocked from finance', async () => {
    const supportToken = await loginOps(E2E_OPS_SUPPORT_EMAIL, E2E_OPS_PASSWORD);
    const complianceToken = await loginOps(E2E_OPS_COMPLIANCE_EMAIL, E2E_OPS_PASSWORD);

    const customers = await fetch(`${API}/ops/customers`, {
      headers: { Authorization: `Bearer ${supportToken}` }
    });
    expect(customers.status).toBe(200);

    const finance = await fetch(`${API}/ops/finance/payments`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    expect(finance.status).toBe(403);
  });

  test('ops finance and audit update after completed wash', async () => {
    const customerToken = await loginCustomer(E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD);
    const driverLogin = await api<{ session: { tokens: { accessToken: string } }; profile?: { id: string } }>(
      '/auth/driver/login',
      'POST',
      { email: E2E_DRIVER_EMAIL, password: E2E_DRIVER_PASSWORD }
    );
    const opsToken = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);
    await runGoldenWash({
      customerToken,
      driverToken: driverLogin.session.tokens.accessToken,
      opsToken,
      driverId: E2E_DRIVER_ID
    });

    const finance = await api<Array<{ status: string }>>('/ops/finance/payments', 'GET', undefined, opsToken);
    expect(finance.some((row) => row.status === 'PAID')).toBeTruthy();

    const audit = await api('/ops/activity', 'GET', undefined, opsToken);
    expect(audit).toBeTruthy();
  });
});
