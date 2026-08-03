const base = 'http://localhost:4000';

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
  const payload = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${raw}`);
  }
  return payload;
};

const run = async () => {
  const customer = await request('/auth/customer/login', 'POST', {
    email: 'customer.smoke@test.com',
    password: 'secret123'
  });
  const driver = await request('/auth/driver/login', 'POST', {
    email: 'driver.smoke@test.com',
    password: 'secret123'
  });
  const admin = await request('/auth/ops-admin/login', 'POST', {
    email: 'admin@driplesswash.com',
    password: 'admin1234'
  });

  const booking = await request(
    '/bookings',
    'POST',
    {
      customerId: customer.profile.id,
      customerName: customer.profile.name,
      serviceName: 'Car Wash',
      optionName: 'Premium',
      pickupLocation: 'Smoke Test Address',
      paymentMethod: 'Visa',
      price: 42,
      scheduledDate: '2026-08-10',
      scheduledTime: '10:00'
    },
    customer.session.tokens.accessToken
  );

  const incomingJob = await request(
    '/driver/jobs/incoming',
    'POST',
    {
      driverId: driver.profile.id
    },
    driver.session.tokens.accessToken
  );

  await request(
    `/bookings/${incomingJob.id}/status`,
    'PATCH',
    {
      status: 'EN_ROUTE'
    },
    driver.session.tokens.accessToken
  );

  await request(
    `/bookings/${booking.id}/status`,
    'PATCH',
    {
      status: 'IN_PROGRESS',
      metadata: {
        reason: 'Smoke test admin override'
      }
    },
    admin.session.tokens.accessToken
  );

  const summary = await request(
    '/ops/dashboard/summary',
    'GET',
    undefined,
    admin.session.tokens.accessToken
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        customerId: customer.profile.id,
        driverId: driver.profile.id,
        adminId: admin.profile.id,
        bookingId: booking.id,
        incomingJobId: incomingJob.id,
        summary
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
