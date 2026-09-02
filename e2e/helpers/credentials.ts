/** Demo seed users (backend-api/prisma/seed.ts). Override via E2E_* env for local/staging runs. */
export const E2E_CUSTOMER_EMAIL =
  process.env.E2E_CUSTOMER_EMAIL || 'customer@demo.dripless.local';
export const E2E_CUSTOMER_PASSWORD =
  process.env.E2E_CUSTOMER_PASSWORD || 'DemoPass123!';
export const E2E_DRIVER_EMAIL = process.env.E2E_DRIVER_EMAIL || 'driver@demo.dripless.local';
export const E2E_DRIVER_PASSWORD = process.env.E2E_DRIVER_PASSWORD || 'DemoPass123!';
export const E2E_DRIVER_ID = process.env.E2E_DRIVER_ID || 'driver_demo_001';
export const E2E_OPS_EMAIL = process.env.E2E_OPS_EMAIL || 'ops@demo.dripless.local';
export const E2E_OPS_PASSWORD = process.env.E2E_OPS_PASSWORD || 'DemoPass123!';
export const E2E_OPS_DISPATCH_EMAIL =
  process.env.E2E_OPS_DISPATCH_EMAIL || 'ops.dispatch@demo.dripless.local';
export const E2E_OPS_SUPPORT_EMAIL =
  process.env.E2E_OPS_SUPPORT_EMAIL || 'ops.support@demo.dripless.local';
export const E2E_OPS_COMPLIANCE_EMAIL =
  process.env.E2E_OPS_COMPLIANCE_EMAIL || 'ops.compliance@demo.dripless.local';
