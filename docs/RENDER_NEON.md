# Deploy Dripless on Neon + Render

Staging cloud stack: **Neon Postgres** (database) + **Render** (API, Redis, Customer/Driver/Ops static sites).

## 1. Create Neon database

1. Sign up / sign in at [https://console.neon.tech](https://console.neon.tech).
2. **New project** → name `dripless` → region close to Render (`Frankfurt` / `eu-central-1` preferred).
3. Open **Connection details**.
4. Copy the **pooled** connection string and ensure it includes `sslmode=require`, e.g.

   ```text
   postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

5. (Optional) Create a branch named `staging` and use that connection string instead of main.

## 2. Put the code on GitHub

Render Blueprints deploy from a Git repo.

```powershell
cd "c:\Users\User001\Downloads\Dripless\Dripless-Carwash-main\Dripless-Carwash-main"
git init
git add .
git commit -m "Add Render Blueprint and Neon staging deploy profile"
gh auth login
gh repo create dripless-carwash --private --source=. --remote=origin --push
```

## 3. Deploy the Render Blueprint

1. Open [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the GitHub repo and select `render.yaml`.
3. When prompted, paste:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL from step 1 |
   | `PUBLIC_API_URL` | `https://dripless-api.onrender.com` (confirm after create) |
   | `CUSTOMER_APP_URL` | `https://dripless-customer.onrender.com` |
   | `DRIVER_APP_URL` | `https://dripless-driver.onrender.com` |
   | `OPS_APP_URL` | `https://dripless-ops.onrender.com` |
   | `CORS_ORIGINS` | comma-separated list of the three app URLs above |
   | `WEBAUTHN_RP_ID` | hostname only, e.g. `dripless-ops.onrender.com` |
   | `WEBAUTHN_ORIGIN` | `https://dripless-ops.onrender.com` |

   If Render assigns a unique suffix (e.g. `dripless-api-xxxx.onrender.com`), use those exact URLs.

4. Apply the Blueprint. First API deploy runs `prisma migrate deploy`, then `prisma/seed.ts` once (`initialDeployHook`).

## 4. Verify

```text
GET https://dripless-api.onrender.com/health
GET https://dripless-api.onrender.com/ready
```

Open Customer / Driver / Ops URLs and sign in with demo accounts (`DemoPass123!`).

## 5. What the Blueprint creates

| Service | Role |
|---|---|
| `dripless-redis` | Render Key Value (Redis-compatible) |
| `dripless-api` | Node API + in-process jobs (`DEPLOY_ENV=staging`, `DEMO_MODE=true`) |
| `dripless-customer` | Vite static site |
| `dripless-driver` | Vite static site |
| `dripless-ops` | Vite static site |

Neon is **not** provisioned by Render — always paste `DATABASE_URL` from Neon.

## 6. Promote to production later

Set `DEPLOY_ENV=production`, turn off `DEMO_MODE`, split `PROCESS_ROLE=api` / worker, and fill Ozow/Paystack, S3, MFA, geocoder, etc. (see `backend-api/.env.production.example`). Strict production boots will refuse incomplete config.

## Troubleshooting

- **API 503 on `/health`**: Redis not linked — confirm `REDIS_URL` from `dripless-redis`.
- **CORS errors**: update `CORS_ORIGINS` to exact static-site origins (https, no trailing slash).
- **Frontends call wrong API**: rebuild static sites after API hostname is stable (`VITE_API_HOST` is baked at build time).
- **Empty DB / login fails**: re-run seed from Render Shell: `npx tsx prisma/seed.ts`.
