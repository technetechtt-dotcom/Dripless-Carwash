#!/usr/bin/env node
/**
 * P0 — Ozow sandbox checkout on Customer device.
 * Requires OZOW_* env vars and a physical device with Customer app installed.
 */
const required = ['OZOW_SITE_CODE', 'OZOW_PRIVATE_KEY', 'OZOW_API_KEY', 'STAGING_CUSTOMER_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.log('Ozow device checklist — configure then re-run:');
  for (const key of missing) console.log(`  - ${key}`);
  console.log('\nSteps:');
  console.log('  1. npm run mobile:ready');
  console.log('  2. Open Customer app on Android device');
  console.log('  3. Book car-wash → pay with Ozow sandbox → confirm return to /payment-return');
  process.exit(process.env.PILOT_STRICT === '1' ? 1 : 0);
}
console.log('Ozow env present. Run manual device checkout against', process.env.STAGING_CUSTOMER_URL);
