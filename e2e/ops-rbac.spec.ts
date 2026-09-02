import { expect, test } from '@playwright/test';
import { api, loginOps, API } from './helpers/api-client';
import {
  E2E_OPS_EMAIL,
  E2E_OPS_PASSWORD,
  E2E_OPS_DISPATCH_EMAIL,
  E2E_OPS_SUPPORT_EMAIL,
  E2E_OPS_COMPLIANCE_EMAIL
} from './helpers/credentials';

const OPS_SECTIONS = [
  '/ops/dashboard/summary',
  '/ops/bookings',
  '/ops/drivers',
  '/ops/customers',
  '/ops/incidents',
  '/ops/notifications',
  '/ops/specials',
  '/ops/finance/payments',
  '/ops/activity',
  '/ops/analytics'
];

test.describe('Ops RBAC acceptance', () => {
  test('super admin reaches all command sections', async () => {
    const token = await loginOps(E2E_OPS_EMAIL, E2E_OPS_PASSWORD);
    for (const path of OPS_SECTIONS) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBeLessThan(500);
    }
  });

  test('dispatcher can read bookings and drivers', async () => {
    const token = await loginOps(E2E_OPS_DISPATCH_EMAIL, E2E_OPS_PASSWORD);
    for (const path of ['/ops/bookings', '/ops/drivers', '/ops/dashboard/summary']) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBe(200);
    }
  });

  test('support can read customers and incidents', async () => {
    const token = await loginOps(E2E_OPS_SUPPORT_EMAIL, E2E_OPS_PASSWORD);
    for (const path of ['/ops/customers', '/ops/incidents', '/ops/bookings']) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBe(200);
    }
  });

  test('compliance can read drivers and verify queue', async () => {
    const token = await loginOps(E2E_OPS_COMPLIANCE_EMAIL, E2E_OPS_PASSWORD);
    for (const path of ['/ops/drivers', '/ops/driver-documents', '/ops/incidents']) {
      const response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status, path).toBe(200);
    }
    const finance = await fetch(`${API}/ops/finance/payments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(finance.status).toBe(403);
  });
});
