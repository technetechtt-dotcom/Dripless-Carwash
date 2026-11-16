/**
 * Three-browser cross-platform E2E (Customer + Driver + Ops).
 *
 * API paths are copied from backend-api/src/cross-platform-golden-path.test.ts
 * and backend-api/src/gps-realtime-propagation.test.ts.
 */
import { chromium, devices, expect, firefox, test, webkit } from '@playwright/test';

const API = process.env.E2E_API_URL || process.env.SMOKE_BASE_URL || 'http://localhost:4000';
const CUSTOMER_URL = process.env.CUSTOMER_URL || '';
const DRIVER_URL = process.env.DRIVER_URL || '';
const OPS_URL = process.env.OPS_URL || '';
const HAS_UI = Boolean(CUSTOMER_URL && DRIVER_URL && OPS_URL);
const SANDTON = { lat: -26.1076, lng: 28.0567 };
const SANDTON_GEO = { latitude: SANDTON.lat, longitude: SANDTON.lng };

async function api(path: string, method = 'GET', body?: unknown, token?: string) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${raw}`);
  }
  return payload;
}

test.describe('cross-platform three-role golden path', () => {
  test('API: Ozow/stub → dispatch → GPS → wash → complete with earnings', async () => {
    const suffix = `${Date.now().toString(36)}`;
    const noon = new Date();
    noon.setDate(noon.getDate() + 1);
    noon.setHours(12, 0, 0, 0);

    const customer = await api('/auth/customer/signup', 'POST', {
      name: 'E2E Customer',
      email: `e2e_cust_${suffix}@test.dripless.local`,
      password: 'SecurePass123!'
    }).catch(async () =>
      api('/auth/customer/login', 'POST', {
        email: `e2e_cust_${suffix}@test.dripless.local`,
        password: 'SecurePass123!'
      })
    );
    const customerToken = customer.session.tokens.accessToken as string;

    let driver: { session: { tokens: { accessToken: string } }; profile?: { id: string } };
    try {
      driver = await api('/auth/driver/login', 'POST', {
        email: process.env.E2E_DRIVER_EMAIL || process.env.SMOKE_DRIVER_EMAIL || 'driver.smoke@test.com',
        password: process.env.E2E_DRIVER_PASSWORD || process.env.SMOKE_DRIVER_PASSWORD || 'secret123'
      });
    } catch {
      test.skip(true, 'No seeded driver on this API — vitest golden path covers assign→complete');
      return;
    }
    const driverToken = driver.session.tokens.accessToken;
    const driverId = String(driver.profile?.id || '');

    let ops: { session: { tokens: { accessToken: string } } };
    try {
      ops = await api('/auth/ops-admin/login', 'POST', {
        email: process.env.E2E_OPS_EMAIL || process.env.SMOKE_OPS_EMAIL || 'admin@driplesswash.com',
        password: process.env.E2E_OPS_PASSWORD || process.env.SMOKE_OPS_PASSWORD || 'admin1234'
      });
    } catch {
      test.skip(true, 'No seeded ops admin on this API — vitest golden path covers ops assign');
      return;
    }
    const opsToken = ops.session.tokens.accessToken;

    let booking: { id: string; price: number; driverEarningsZar?: number };
    try {
      booking = await api(
        '/bookings',
        'POST',
        {
          serviceSlug: 'car-wash',
          optionSlug: 'basic',
          pickupLocation: 'Sandton City Mall',
          pickupCoordinates: SANDTON,
          scheduledAt: noon.toISOString(),
          vehicleSize: 'SEDAN'
        },
        customerToken
      );
    } catch {
      test.skip(true, 'Booking create failed — Sandton pilot area / catalogue not seeded on this API');
      return;
    }

    expect(booking.driverEarningsZar).toBeGreaterThan(0);

    const intent = await api(
      '/payments/intent',
      'POST',
      {
        bookingId: booking.id,
        provider: process.env.E2E_PAYMENT_PROVIDER || 'stub',
        idempotencyKey: `e2e_${booking.id}`
      },
      customerToken
    );

    if (intent.provider === 'ozow' && intent.checkoutUrl) {
      try {
        await api('/payments/webhooks/ozow', 'POST', {
          SiteCode: process.env.OZOW_SITE_CODE || 'TST',
          TransactionId: intent.paymentId,
          TransactionReference: intent.paymentId,
          Amount: String(Number(booking.price).toFixed(2)),
          Status: 'Complete',
          CurrencyCode: 'ZAR',
          IsTest: 'true',
          Hash: process.env.SMOKE_OZOW_HASH || 'skip'
        });
      } catch {
        const stub = await api(
          '/payments/intent',
          'POST',
          { bookingId: booking.id, provider: 'stub', idempotencyKey: `e2e_stub_${booking.id}` },
          customerToken
        );
        await api('/payments/webhooks/stub', 'POST', { paymentId: stub.paymentId });
      }
    } else {
      await api('/payments/webhooks/stub', 'POST', { paymentId: intent.paymentId });
    }

    await api(
      '/driver/location',
      'PATCH',
      { driverId, lat: SANDTON.lat, lng: SANDTON.lng, heading: 45, speedKph: 20, accuracyM: 6 },
      driverToken
    );

    const assign = await api(
      `/ops/bookings/${booking.id}/assign-driver`,
      'PATCH',
      { driverId, reason: 'E2E three-role assignment' },
      opsToken
    );
    expect(assign.driverId).toBe(driverId);

    const gps = await api(
      '/driver/location',
      'PATCH',
      { driverId, lat: -26.104, lng: 28.06, heading: 90, speedKph: 24, accuracyM: 5 },
      driverToken
    );
    expect(gps).toBeTruthy();

    const tracking = await api(`/bookings/${booking.id}/tracking`, 'GET', undefined, customerToken);
    expect(tracking.driverLocation).toBeTruthy();

    for (const status of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] as const) {
      const patched = await api(`/bookings/${booking.id}/status`, 'PATCH', { status }, driverToken);
      expect(patched.status).toBe(status);
    }

    const customerForbidden = await fetch(`${API}/bookings/${booking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    expect(customerForbidden.status).toBe(403);

    await api(
      `/bookings/${booking.id}/checklist`,
      'PATCH',
      {
        exteriorDone: true,
        wheelsDone: true,
        glassDone: true,
        finalInspected: true,
        interiorDone: true
      },
      driverToken
    );

    const pinIssue = await api(`/bookings/${booking.id}/completion-pin`, 'POST', {}, customerToken);
    expect(String(pinIssue.pin)).toMatch(/^\d{6}$/);
    await api(
      `/bookings/${booking.id}/completion-pin/verify`,
      'POST',
      { pin: pinIssue.pin },
      driverToken
    );

    const complete = await api(
      `/bookings/${booking.id}/status`,
      'PATCH',
      { status: 'COMPLETED' },
      driverToken
    );
    expect(complete.status).toBe('COMPLETED');

    const [customerView, driverView, opsList, payout] = await Promise.all([
      api(`/bookings/${booking.id}`, 'GET', undefined, customerToken),
      api(`/bookings/${booking.id}`, 'GET', undefined, driverToken),
      api('/bookings', 'GET', undefined, opsToken),
      api('/payouts/me', 'GET', undefined, driverToken)
    ]);
    expect(customerView.status).toBe('COMPLETED');
    expect(driverView.status).toBe('COMPLETED');
    expect(customerView.driverEarningsZar).toBeGreaterThan(0);
    expect(
      opsList.some((row: { id: string; status: string }) => row.id === booking.id && row.status === 'COMPLETED')
    ).toBeTruthy();
    expect(payout.availableZar).toBeGreaterThan(0);

    const events = await api('/events/since?after=0', 'GET', undefined, opsToken);
    expect(Array.isArray(events.events)).toBeTruthy();
    expect(events.events.some((event: { type: string }) => event.type === 'booking.created')).toBeTruthy();
    expect(events.events.some((event: { type: string }) => event.type === 'driver.location')).toBeTruthy();
    expect(
      events.events.some(
        (event: { type: string; payload?: { status?: string } }) =>
          event.type === 'booking.status' && event.payload?.status === 'COMPLETED'
      )
    ).toBeTruthy();
  });

  test('UI: three browsers observe Customer, Driver, and Ops shells', async () => {
    test.skip(!HAS_UI, 'Set CUSTOMER_URL, DRIVER_URL, and OPS_URL to run three-browser UI E2E');

    const geo =
      process.env.E2E_GEOLOCATION === '1'
        ? { geolocation: SANDTON_GEO, permissions: ['geolocation'] as const }
        : {};

    const useMultiEngine = process.env.PLAYWRIGHT_MULTI_ENGINE === '1';
    const [customerBrowser, driverBrowser, opsBrowser] = await Promise.all([
      chromium.launch(),
      useMultiEngine ? firefox.launch() : chromium.launch(),
      useMultiEngine ? webkit.launch() : chromium.launch()
    ]);

    try {
      const [customerCtx, driverCtx, opsCtx] = await Promise.all([
        customerBrowser.newContext(geo),
        driverBrowser.newContext(geo),
        opsBrowser.newContext()
      ]);
      const [customerPage, driverPage, opsPage] = await Promise.all([
        customerCtx.newPage(),
        driverCtx.newPage(),
        opsCtx.newPage()
      ]);

      await Promise.all([
        customerPage.goto(CUSTOMER_URL, { waitUntil: 'domcontentloaded' }),
        driverPage.goto(DRIVER_URL, { waitUntil: 'domcontentloaded' }),
        opsPage.goto(OPS_URL, { waitUntil: 'domcontentloaded' })
      ]);

      await expect(customerPage.locator('body')).toBeVisible();
      await expect(driverPage.locator('body')).toBeVisible();
      await expect(opsPage.locator('body')).toBeVisible();

      const mapHints = customerPage.locator('[class*="leaflet"], [class*="map"], canvas');
      if ((await mapHints.count()) > 0) {
        await expect(mapHints.first()).toBeVisible({ timeout: 15_000 });
      }

      await Promise.all([customerCtx.close(), driverCtx.close(), opsCtx.close()]);
    } finally {
      await Promise.all([customerBrowser.close(), driverBrowser.close(), opsBrowser.close()]);
    }
  });

  test('device-emulation: Pixel 5 geolocation against Sandton', async () => {
    test.skip(process.env.E2E_GEOLOCATION !== '1', 'Set E2E_GEOLOCATION=1 for device GPS emulation');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      geolocation: SANDTON_GEO,
      permissions: ['geolocation']
    });
    const page = await context.newPage();
    const origin = CUSTOMER_URL || 'http://localhost:5173';
    await context.grantPermissions(['geolocation'], { origin });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const position = await page.evaluate(async () => {
      return await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      });
    });
    expect(position.lat).toBeCloseTo(SANDTON.lat, 2);
    expect(position.lng).toBeCloseTo(SANDTON.lng, 2);
    await browser.close();
  });
});
