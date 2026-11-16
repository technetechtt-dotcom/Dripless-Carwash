/**
 * API smoke against the current Ozow-first payment architecture.
 *
 * Usage:
 *   node tools/smoke-api.mjs
 *   SMOKE_BASE_URL=http://localhost:4000 node tools/smoke-api.mjs
 *
 * Flow: customer book → payment intent (ozow|stub) → pay webhook → ops assign →
 * driver status ladder → ops dashboard summary.
 *
 * When Ozow credentials are not configured, falls back to stub webhook so CI/local
 * smoke still exercises the booking + dispatch path.
 */
const base = process.env.SMOKE_BASE_URL || 'http://localhost:4000';

const request = async (path, method = 'GET', body, token) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${raw}`);
  }
  return payload;
};

const loginOrSignup = async (role, email, password, signupBody) => {
  try {
    return await request(`/auth/${role}/login`, 'POST', { email, password });
  } catch {
    if (!signupBody) throw new Error(`Login failed for ${email}`);
    return request(`/auth/${role}/signup`, 'POST', signupBody);
  }
};

const run = async () => {
  const suffix = `${Date.now().toString(36)}`;
  const customerEmail = process.env.SMOKE_CUSTOMER_EMAIL || `customer.smoke.${suffix}@test.com`;
  const driverEmail = process.env.SMOKE_DRIVER_EMAIL || `driver.smoke.${suffix}@test.com`;
  const adminEmail = process.env.SMOKE_OPS_EMAIL || 'admin@driplesswash.com';
  const adminPassword = process.env.SMOKE_OPS_PASSWORD || 'admin1234';

  const customer = await loginOrSignup(
    'customer',
    customerEmail,
    'secret123',
    {
      name: 'Smoke Customer',
      email: customerEmail,
      password: 'secret123'
    }
  );

  let driver;
  try {
    driver = await request('/auth/driver/login', 'POST', {
      email: driverEmail,
      password: 'secret123'
    });
  } catch {
    // Prefer seeded driver when present
    driver = await request('/auth/driver/login', 'POST', {
      email: 'driver.smoke@test.com',
      password: 'secret123'
    }).catch(() => null);
    if (!driver) {
      throw new Error('Driver login failed — seed a verified driver or set SMOKE_DRIVER_EMAIL');
    }
  }

  const admin = await request('/auth/ops-admin/login', 'POST', {
    email: adminEmail,
    password: adminPassword
  });

  const customerToken = customer.session.tokens.accessToken;
  const driverToken = driver.session.tokens.accessToken;
  const opsToken = admin.session.tokens.accessToken;

  const noon = new Date();
  noon.setHours(12, 0, 0, 0);

  const booking = await request(
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

  const preferOzow = process.env.SMOKE_PROVIDER !== 'stub';
  let paymentId;
  let paymentProvider = 'stub';

  const intentBody = {
    bookingId: booking.id,
    idempotencyKey: `smoke_${booking.id}`,
    ...(preferOzow ? { provider: 'ozow' } : { provider: 'stub' })
  };

  try {
    const intent = await request('/payments/intent', 'POST', intentBody, customerToken);
    paymentId = intent.paymentId || intent.id;
    paymentProvider = intent.provider || intentBody.provider;
  } catch (error) {
    if (!preferOzow) throw error;
    // Ozow not configured → stub fallback
    const intent = await request(
      '/payments/intent',
      'POST',
      { bookingId: booking.id, provider: 'stub', idempotencyKey: `smoke_stub_${booking.id}` },
      customerToken
    );
    paymentId = intent.paymentId || intent.id;
    paymentProvider = 'stub';
  }

  if (paymentProvider === 'ozow') {
    // Simulate Ozow notify (sandbox/dev) — requires OZOW_PRIVATE_KEY on server;
    // when signature verification fails, fall back to stub for local smoke.
    try {
      await request('/payments/webhooks/ozow', 'POST', {
        SiteCode: process.env.OZOW_SITE_CODE || 'SMOKE',
        TransactionId: `ozow_txn_${suffix}`,
        TransactionReference: paymentId,
        Amount: String(Number(booking.price).toFixed(2)),
        Status: 'Complete',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        Hash: process.env.SMOKE_OZOW_HASH || 'skip'
      });
    } catch {
      const stubIntent = await request(
        '/payments/intent',
        'POST',
        {
          bookingId: booking.id,
          provider: 'stub',
          idempotencyKey: `smoke_stub_fallback_${booking.id}`
        },
        customerToken
      );
      paymentId = stubIntent.paymentId || stubIntent.id;
      paymentProvider = 'stub';
      await request('/payments/webhooks/stub', 'POST', { paymentId });
    }
  } else {
    await request('/payments/webhooks/stub', 'POST', { paymentId });
  }

  const assign = await request(
    `/ops/bookings/${booking.id}/assign-driver`,
    'PATCH',
    { driverId: driver.profile.id, reason: 'Smoke assign' },
    opsToken
  );

  for (const status of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']) {
    await request(
      `/bookings/${booking.id}/status`,
      'PATCH',
      { status },
      driverToken
    );
  }

  const authoritative = await request(`/bookings/${booking.id}`, 'GET', undefined, customerToken);
  const summary = await request('/ops/dashboard/summary', 'GET', undefined, opsToken);

  console.log(
    JSON.stringify(
      {
        ok: true,
        architecture: 'ozow-first',
        paymentProvider,
        customerId: customer.profile.id,
        driverId: driver.profile.id,
        adminId: admin.profile.id,
        bookingId: booking.id,
        assignedDriverId: assign.driverId,
        bookingStatus: authoritative.status,
        paymentStatus: authoritative.paymentStatus,
        driverEarningsZar: authoritative.driverEarningsZar,
        summaryKeys: summary && typeof summary === 'object' ? Object.keys(summary) : []
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Smoke test failed');
  process.exit(1);
});
