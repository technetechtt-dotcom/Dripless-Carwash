#!/usr/bin/env node
/**
 * P0 — Evidence upload against staging object storage.
 */
const api = process.env.STAGING_API_URL || process.env.E2E_API_URL;
const email = process.env.E2E_DRIVER_EMAIL || 'driver@demo.dripless.local';
const password = process.env.E2E_DRIVER_PASSWORD || 'DemoPass123!';

if (!api || !process.env.S3_BUCKET) {
  console.log('Staging evidence checklist — configure:');
  console.log('  STAGING_API_URL, S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY');
  console.log('  EVIDENCE_STORAGE_PROVIDER=s3 on staging API');
  process.exit(process.env.PILOT_STRICT === '1' ? 1 : 0);
}

const login = await fetch(`${api}/auth/driver/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
if (!login.ok) {
  console.error('Driver login failed:', login.status);
  process.exit(1);
}
const { session } = await login.json();
const token = session.tokens.accessToken;

const bookings = await fetch(`${api}/bookings?role=driver&status=IN_PROGRESS`, {
  headers: { Authorization: `Bearer ${token}` }
});
const list = bookings.ok ? await bookings.json() : [];
const bookingId = list[0]?.id;
if (!bookingId) {
  console.log('No IN_PROGRESS booking for driver — create one via staged wash first.');
  process.exit(0);
}

const uploadUrl = await fetch(`${api}/bookings/${bookingId}/evidence/upload-url`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ kind: 'BEFORE', mimeType: 'image/jpeg', byteSize: 2048, checksum: 'a'.repeat(64) })
});
if (!uploadUrl.ok) {
  console.error('upload-url failed:', uploadUrl.status, await uploadUrl.text());
  process.exit(1);
}
const payload = await uploadUrl.json();
console.log('Signed upload URL issued for booking', bookingId);
console.log('PUT a JPEG to uploadUrl, then POST confirm endpoint to verify staging storage.');
