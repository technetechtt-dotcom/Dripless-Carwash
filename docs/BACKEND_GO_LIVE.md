# Backend go-live (Render + Neon)

## Prerequisites

- Neon project **dripless wash** (already provisioned)
- GitHub account (Render builds from Git)
- Render account

## 1. Push this repo to GitHub

```powershell
gh auth login --hostname github.com --git-protocol https --web
gh repo create dripless-carwash --private --source=. --remote=origin --push
```

## 2. Create Render Blueprint

1. Open https://dashboard.render.com/blueprints/new
2. Connect the `dripless-carwash` GitHub repo
3. Select `render.yaml`
4. When prompted for `DATABASE_URL`, paste the **pooled** Neon URL:

   ```text
   postgresql://neondb_owner:***@ep-damp-mud-afonui1e-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30
   ```

   (Full value is in local gitignored `backend-api/.env.neon`.)

5. Apply. Render creates Redis + `dripless-api`.

## 3. Verify

```text
GET https://dripless-api.onrender.com/health
GET https://dripless-api.onrender.com/ready
```

Demo logins (seeded on first deploy): `*@demo.dripless.local` / `DemoPass123!`

## 4. Point local apps at live API (optional)

In each app `.env`:

```text
VITE_API_BASE_URL=https://dripless-api.onrender.com
```

Then set Render `CORS_ORIGINS` to your frontend origins (or keep localhost for local UI → live API).
