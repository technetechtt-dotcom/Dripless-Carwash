# Dripless Backend API

Secure TypeScript API for Customer, Driver, and Ops Admin apps.

## Stack

- Express + Zod + Helmet + CORS allowlist
- Prisma + Neon/Postgres
- bcrypt passwords, opaque access tokens, hashed refresh tokens with rotation

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

There is no production admin seed in application code. Bootstrap the first ops admin with:

```bash
npm run bootstrap:admin -- --email you@company.com --password 'StrongPass123!'
```

Or set `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` on first boot when zero admins exist.

## Wire apps

Create `.env` in each app from `.env.example`:

```
VITE_API_BASE_URL=http://localhost:4000
```

UI-only mock (no remote API) requires an explicit opt-in:

```
VITE_USE_MOCK_API=true
```

## Android release signing

Customer and Driver Android release builds **fail** if `android/keystore.properties` is missing. Provide CI secrets for `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Do not use debug signing for release.

## Tests

```bash
npm run typecheck
npm run test
```
