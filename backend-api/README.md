# Dripless Backend API

Shared backend for all three apps:
- Customer app
- Driver app
- Ops Admin dashboard

## Run locally

```bash
npm install
npm run dev
```

Default port: `4000`

## Data persistence

State is saved to `backend-api/data/state.json`.

## Auth seed

Default ops admin:
- email: `admin@driplesswash.com`
- password: any 8+ chars (example: `admin1234`)

## Wire apps

Create `.env` in each app from `.env.example`:

`VITE_API_BASE_URL=http://localhost:4000`

Then run each app normally; they will all communicate through this backend.
