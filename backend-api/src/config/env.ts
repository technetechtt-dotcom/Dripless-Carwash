import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  PROCESS_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175'),
  CUSTOMER_APP_URL: z.string().default('http://localhost:5173'),
  DRIVER_APP_URL: z.string().default('http://localhost:5174'),
  OPS_APP_URL: z.string().default('http://localhost:5175'),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:5175'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  BCRYPT_COST: z.coerce.number().min(10).max(15).default(12),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional().default(''),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional().default(''),
  GEOCODER_PROVIDER: z.enum(['none', 'mapbox', 'google']).default('none'),
  ROUTING_PROVIDER: z.enum(['none', 'mapbox', 'google']).default('none'),
  MAPBOX_ACCESS_TOKEN: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  PAYSTACK_SECRET_KEY: z.string().optional().default(''),
  PAYSTACK_PUBLIC_KEY: z.string().optional().default(''),
  PAYFAST_MERCHANT_ID: z.string().optional().default(''),
  PAYFAST_MERCHANT_KEY: z.string().optional().default(''),
  PAYFAST_PASSPHRASE: z.string().optional().default(''),
  OZOW_SITE_CODE: z.string().optional().default(''),
  OZOW_API_KEY: z.string().optional().default(''),
  OZOW_PRIVATE_KEY: z.string().optional().default(''),
  OZOW_NOTIFY_URL: z.string().optional().default(''),
  OZOW_API_BASE_URL: z.string().optional().default('https://api.ozow.com'),
  OZOW_IS_TEST: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  PUBLIC_API_URL: z.string().optional().default('http://localhost:4000'),
  PAYMENTS_PROVIDER: z.enum(['stub', 'paystack', 'payfast', 'ozow', 'wallet']).default('stub'),
  PAYSTACK_CALLBACK_URL: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  MFA_ENC_KEY: z.string().optional().default(''),
  COMPLETION_PIN_PEPPER: z.string().optional().default(''),
  MFA_REQUIRED_OPS: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  EVIDENCE_STORAGE_DIR: z.string().optional().default('data/evidence'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Dripless <noreply@dripless.co.za>'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM: z.string().optional().default(''),
  FCM_SERVER_KEY: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('af-south-1'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  EVIDENCE_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  EVIDENCE_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),
  EVIDENCE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  DRIVER_DOCUMENT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  GPS_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  INVOICE_RENDERER_PATH: z.string().default('src/invoices/generate_invoice.py'),
  PYTHON_BIN: z.string().default('python'),
  VAT_RATE_BPS: z.coerce.number().int().min(0).max(3000).default(0),
  VAT_NUMBER: z.string().optional().default(''),
  MALWARE_SCAN_URL: z.string().optional().default(''),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional().default(''),
  SENTRY_DSN: z.string().optional().default(''),
  ALERT_WEBHOOK_URL: z.string().optional().default(''),
  REQUIRE_SMS_DELIVERY: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  demoMode: Boolean(parsed.data.DEMO_MODE) && parsed.data.NODE_ENV !== 'production'
};

export function assertProductionConfiguration() {
  if (!env.isProduction) return;

  const missing: string[] = [];
  const requireValue = (name: keyof typeof env, configured = Boolean(env[name])) => {
    if (!configured) missing.push(String(name));
  };

  requireValue('REDIS_URL');
  requireValue('MFA_ENC_KEY', env.MFA_ENC_KEY.length >= 32);
  requireValue('COMPLETION_PIN_PEPPER', env.COMPLETION_PIN_PEPPER.length >= 32);
  requireValue('MFA_REQUIRED_OPS', env.MFA_REQUIRED_OPS);
  if (env.PAYMENTS_PROVIDER === 'ozow') {
    requireValue('OZOW_SITE_CODE');
    requireValue('OZOW_API_KEY');
    requireValue('OZOW_PRIVATE_KEY');
    requireValue('OZOW_NOTIFY_URL', Boolean(env.OZOW_NOTIFY_URL || env.PUBLIC_API_URL));
    requireValue('PUBLIC_API_URL');
  } else {
    requireValue('PAYSTACK_SECRET_KEY');
    requireValue('PAYSTACK_PUBLIC_KEY');
    requireValue('PAYSTACK_CALLBACK_URL');
  }
  requireValue('GEOCODER_PROVIDER', env.GEOCODER_PROVIDER !== 'none');
  requireValue('ROUTING_PROVIDER', env.ROUTING_PROVIDER !== 'none');
  if (env.GEOCODER_PROVIDER === 'mapbox') requireValue('MAPBOX_ACCESS_TOKEN');
  if (env.GEOCODER_PROVIDER === 'google') requireValue('GOOGLE_MAPS_API_KEY');
  if (env.ROUTING_PROVIDER === 'mapbox') requireValue('MAPBOX_ACCESS_TOKEN');
  if (env.ROUTING_PROVIDER === 'google') requireValue('GOOGLE_MAPS_API_KEY');
  requireValue('EVIDENCE_STORAGE_PROVIDER', env.EVIDENCE_STORAGE_PROVIDER === 's3');
  requireValue('S3_BUCKET');
  requireValue('S3_ACCESS_KEY');
  requireValue('S3_SECRET_KEY');
  requireValue('MALWARE_SCAN_URL');
  requireValue('RESEND_API_KEY');
  requireValue(
    'FCM_SERVICE_ACCOUNT_JSON',
    Boolean(env.FCM_SERVICE_ACCOUNT_JSON || env.FCM_SERVER_KEY)
  );
  requireValue('SENTRY_DSN');
  requireValue('CUSTOMER_APP_URL');
  requireValue('DRIVER_APP_URL');
  requireValue('OPS_APP_URL');
  requireValue('WEBAUTHN_RP_ID');
  requireValue('WEBAUTHN_ORIGIN', env.WEBAUTHN_ORIGIN.startsWith('https://'));
  if (env.REQUIRE_SMS_DELIVERY) {
    requireValue('TWILIO_ACCOUNT_SID');
    requireValue('TWILIO_AUTH_TOKEN');
    requireValue('TWILIO_FROM');
  }

  if (env.PAYMENTS_PROVIDER !== 'paystack' && env.PAYMENTS_PROVIDER !== 'ozow') {
    missing.push('PAYMENTS_PROVIDER=paystack|ozow');
  }
  if (env.PROCESS_ROLE === 'all') {
    missing.push('PROCESS_ROLE=api or worker (run separate production processes)');
  }
  if (env.corsOrigins.some((origin) => /localhost|127\.0\.0\.1|\*/.test(origin))) {
    missing.push('CORS_ORIGINS (production origins only)');
  }

  if (missing.length) {
    throw new Error(`Unsafe production configuration: ${missing.join(', ')}`);
  }
}
