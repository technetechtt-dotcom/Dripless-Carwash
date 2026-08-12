# Operations runbook

## Health

- Liveness: `GET /health`
- Readiness: `GET /ready` (Postgres + job stats)
- Realtime: `GET /events/stream` (SSE, auth required)

## Payments

Paystack is the production South African provider. Webhooks:

- `/payments/webhooks/paystack` (HMAC SHA-512)
- `/payments/webhooks/payfast` (MD5 signature)
- `/payments/webhooks/ozow` (SHA-512)
- `/payments/webhooks/stub` (local demo only)

Replay protection uses `WebhookReceipt`. Amount and currency are verified server-side. Refunds and partial refunds: `POST /payments/:id/refunds`.

## Jobs

Background jobs live in `BackgroundJob`. Queues: `email.send`, `sms.send`, `notification.push`, `invoice.issue`, `payment.retry`, `payment.reconcile`, `privacy.request`, `promo.expire`, `documents.expiry`.

## Alerts

Wire Sentry (`SENTRY_DSN`), payment-failure counts from `/ops/dashboard/summary`, and dead-letter job counts from `/ready`.
