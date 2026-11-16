# Ozow commercial sandbox checklist

Automated CI covers signature, amount, cancel/error, success, duplicate Complete, late Complete, and sync-without-API-key.

Still run against **real Ozow sandbox** credentials before go-live:

| Scenario | Pass? | Notes |
|----------|-------|-------|
| Successful payment | ☐ | Status=Complete webhook + return URL |
| Cancelled payment | ☐ | |
| Failed / Error payment | ☐ | |
| Invalid signature | ☐ | Expect 401 |
| Duplicate webhook | ☐ | Idempotent |
| Wrong amount | ☐ | Expect 400 |
| Late webhook | ☐ | Complete after Cancelled / delayed notify |
| Browser closes before return | ☐ | `PaymentReturn` + `POST /payments/:id/sync` |
| Reconciliation | ☐ | Ops `/ops/reconcile` + Ozow GetTransactionByReference |
| Refund | ☐ | Wallet credit until Ozow refund API is enabled |
| Provider downtime | ☐ | Sync returns `pending_provider`; retry later |

Set `OZOW_IS_TEST=true`, sandbox site code / API key / private key in staging only.
