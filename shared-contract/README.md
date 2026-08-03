# Shared Contract Runtime

The shared API layer supports two modes:

1. **Mock mode** (default): uses in-browser mocked persistence for local demos.
2. **Remote mode**: uses HTTP API endpoints when a base URL is configured.

## Configure Remote Mode

Set a base URL at runtime:

- From app code: `apiRuntimeConfig.setApiBaseUrl("https://api.example.com")`
- Or set `window.__DRIPLESS_API_BASE_URL__` before app boot.

Clear it to return to mock mode:

`apiRuntimeConfig.clearApiBaseUrl()`

## Expected Endpoint Contract

### Auth
- `POST /auth/customer/login`
- `POST /auth/customer/signup`
- `POST /auth/driver/login`
- `POST /auth/driver/signup`
- `POST /auth/ops-admin/login`

Auth responses are expected to return:

```json
{
  "session": {
    "tokens": {
      "accessToken": "string",
      "refreshToken": "string",
      "expiresAt": 0
    },
    "payload": {
      "userId": "string",
      "role": "customer|driver|ops_admin",
      "email": "string"
    }
  },
  "profile": {}
}
```

### Bookings / Jobs
- `POST /bookings`
- `POST /driver/jobs/incoming`
- `PATCH /bookings/:bookingId/status`
- `GET /bookings?customerId=...`

### Ops Admin
- `GET /ops/dashboard/summary`
- `GET /ops/customers`
- `GET /ops/drivers`
- `GET /ops/bookings`
- `POST /ops/notifications/broadcast`

### Notifications
- `GET /notifications?role=...&userId=...`
- `POST /notifications`

## Authorization

When a session exists, requests include:

`Authorization: Bearer <accessToken>`
