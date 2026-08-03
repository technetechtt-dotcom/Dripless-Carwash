# Dripless Backend API

Secure TypeScript API for Customer, Driver, and Ops Admin apps.

## Stack

- Express + Zod + Helmet + CORS allowlist
- Prisma + Neon/Postgres
- bcrypt passwords, opaque access tokens, hashed refresh tokens with rotation
- Payment intent scaffold (Paystack / PayFast / Ozow / stub webhooks)
- Wash evidence endpoints (BEFORE/AFTER/PIN)
- Ops TOTP MFA setup/verify/disable scaffold

## Run locally

```bash
cp .env.example .env
# set DATABASE_URL to your Neon/Postgres connection string
npm install
npx prisma migrate dev
npm run db:seed   # only when DEMO_MODE=true
npm run dev
```

Default port: `4000`

## Demo seed (DEMO_MODE=true only)

- `customer@demo.dripless.local` / `DemoPass123!`
- `driver@demo.dripless.local` / `DemoPass123!`
- `ops@demo.dripless.local` / `DemoPass123!`
- Promo: `ECO10`

Bootstrap production admin (zero ops admins):

```bash
npm run bootstrap:admin -- --email you@company.com --password 'StrongPass123!'
```

## Redis (deferred multi-instance)

`REDIS_URL` is accepted for future shared rate-limit / session store use. The current process uses in-memory `express-rate-limit` and database-backed sessions. Deploy multi-instance auth/rate-limit only after Redis is wired.

## Payments

`POST /payments/intent` creates a payment row and returns a checkout URL.
- Default provider: `stub` (`PAYMENTS_PROVIDER=stub`)
- Webhook stubs: `/payments/webhooks/{stub,paystack,payfast,ozow}`
- Live PSP keys remain optional env values; without keys, stub checkout is used

## Evidence

- `GET|POST /bookings/:bookingId/evidence`
- Wash COMPLETED requires BEFORE + AFTER evidence and completion PIN unless `DEMO_MODE=true`

## MFA (ops scaffold)

- `POST /auth/mfa/setup`
- `POST /auth/mfa/verify`
- `POST /auth/mfa/disable`
- `GET /auth/mfa/webauthn/status` (TODO placeholder)

Set `MFA_ENC_KEY` in production.

## Geocoding

- Real providers: `GEOCODER_PROVIDER=mapbox|google` + API key env
- Production never invents Johannesburg coords from free text
- Demo mode may synthesize coords for UI demos

## Wire apps

```
VITE_API_BASE_URL=http://localhost:4000
```

UI-only mock:

```
VITE_USE_MOCK_API=true
```

## Tests

```bash
npm run typecheck
npm run test
```
