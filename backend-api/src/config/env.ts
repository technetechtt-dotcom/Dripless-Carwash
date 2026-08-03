import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  BCRYPT_COST: z.coerce.number().min(10).max(15).default(12),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional().default(''),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional().default(''),
  GEOCODER_PROVIDER: z.enum(['none', 'mapbox', 'google']).default('none'),
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
  PAYMENTS_PROVIDER: z.enum(['stub', 'paystack', 'payfast', 'ozow']).default('stub'),
  REDIS_URL: z.string().optional().default(''),
  MFA_ENC_KEY: z.string().optional().default(''),
  EVIDENCE_STORAGE_DIR: z.string().optional().default('data/evidence')
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
