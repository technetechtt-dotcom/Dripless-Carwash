#!/usr/bin/env node
/**
 * P0 — FCM push delivery validation.
 */
const required = ['FCM_SERVER_KEY', 'FCM_PROJECT_ID', 'PILOT_TEST_DEVICE_TOKEN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.log('FCM checklist — set env vars then re-run:');
  for (const key of missing) console.log(`  - ${key}`);
  console.log('\nConfigure Firebase in Customer/Driver Capacitor projects.');
  console.log('Send test via backend notifications service or Firebase console.');
  process.exit(process.env.PILOT_STRICT === '1' ? 1 : 0);
}

const token = process.env.PILOT_TEST_DEVICE_TOKEN;
const response = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.FCM_SERVER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: {
      token,
      notification: { title: 'Dripless pilot', body: 'FCM delivery test' }
    }
  })
});
if (!response.ok) {
  console.error('FCM send failed:', response.status, await response.text());
  process.exit(1);
}
console.log('FCM test message accepted by Firebase.');
