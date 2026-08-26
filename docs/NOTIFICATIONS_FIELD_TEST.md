# Push notification field proof

Staging / production requires `FCM_SERVICE_ACCOUNT_JSON` (preferred) or legacy `FCM_SERVER_KEY`.

Clients call `POST /notifications/devices` on login (`registerSessionDevice`).

## Scenarios to prove on physical devices

| Event | Customer | Driver | Ops | App open | Background | Killed | Locked | Poor network |
|-------|:--------:|:------:|:---:|:--------:|:----------:|:------:|:------:|:------------:|
| Driver assigned | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Booking confirmation | ☐ | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Driver arrival | ☐ | ☐ | | ☐ | ☐ | ☐ | ☐ | ☐ |
| Payment success | ☐ | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Payment failure | ☐ | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Cancellation | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Refund (wallet credit) | ☐ | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Job completion | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Incident / escalation | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

Record device models, OS versions, and FCM project id in `docs/WASH_PILOT_LOG.md`.

## Local without FCM

In-app notification lists (Customer + Driver + Ops) still work via `/notifications` and SSE `notification.created`. Device registration stores a stable local token so production FCM can be layered later without another client change.
