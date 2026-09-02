import { api } from './api-client';

const SANDTON = { lat: -26.1076, lng: 28.0567 };

export type GoldenWashResult = {
  bookingId: string;
  paymentId: string;
  customerToken: string;
  driverToken: string;
  opsToken: string;
  driverId: string;
};

export async function runGoldenWash(input: {
  customerToken: string;
  driverToken: string;
  opsToken: string;
  driverId: string;
  paymentProvider?: string;
}): Promise<GoldenWashResult> {
  const noon = new Date();
  noon.setDate(noon.getDate() + 1);
  noon.setHours(12, 0, 0, 0);

  const booking = await api<{ id: string; price: number; driverEarningsZar?: number }>(
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
    input.customerToken
  );

  const intent = await api<{ paymentId: string; provider?: string }>(
    '/payments/intent',
    'POST',
    {
      bookingId: booking.id,
      provider: input.paymentProvider || 'stub',
      idempotencyKey: `wash_${booking.id}`
    },
    input.customerToken
  );

  await api('/payments/webhooks/stub', 'POST', { paymentId: intent.paymentId });
  await api('/payments/webhooks/stub', 'POST', { paymentId: intent.paymentId });

  await api('/driver/online', 'POST', { online: true }, input.driverToken);
  await api(
    '/driver/location',
    'PATCH',
    { lat: SANDTON.lat, lng: SANDTON.lng, accuracyM: 25 },
    input.driverToken
  );

  await api(
    `/ops/bookings/${booking.id}/assign-driver`,
    'PATCH',
    { driverId: input.driverId, reason: 'Staged wash assignment' },
    input.opsToken
  );

  for (const status of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] as const) {
    await api(`/bookings/${booking.id}/status`, 'PATCH', { status }, input.driverToken);
  }

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
    input.driverToken
  );

  const pinIssue = await api<{ pin: string }>(
    `/bookings/${booking.id}/completion-pin`,
    'POST',
    undefined,
    input.customerToken
  );
  await api(
    `/bookings/${booking.id}/completion-pin/verify`,
    'POST',
    { pin: pinIssue.pin },
    input.driverToken
  );

  await api(`/bookings/${booking.id}/status`, 'PATCH', { status: 'COMPLETED' }, input.driverToken);

  return {
    bookingId: booking.id,
    paymentId: intent.paymentId,
    customerToken: input.customerToken,
    driverToken: input.driverToken,
    opsToken: input.opsToken,
    driverId: input.driverId
  };
}

export async function runPaidCancellation(input: {
  customerToken: string;
  paymentProvider?: string;
}) {
  const noon = new Date();
  noon.setDate(noon.getDate() + 1);
  noon.setHours(14, 0, 0, 0);

  const booking = await api<{ id: string }>(
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
    input.customerToken
  );

  const intent = await api<{ paymentId: string }>(
    '/payments/intent',
    'POST',
    {
      bookingId: booking.id,
      provider: input.paymentProvider || 'stub',
      idempotencyKey: `cancel_${booking.id}`
    },
    input.customerToken
  );
  await api('/payments/webhooks/stub', 'POST', { paymentId: intent.paymentId });

  const cancelled = await api<{ status: string }>(
    `/bookings/${booking.id}/cancel`,
    'POST',
    { reason: 'Pilot cancellation test' },
    input.customerToken
  );

  return { bookingId: booking.id, paymentId: intent.paymentId, cancelled };
}
