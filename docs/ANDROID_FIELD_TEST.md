# Android field test — screen lock & background GPS

Use two physical Android phones (Customer + Driver) against staging. This cannot run in CI.

## Build / install

```bash
npm run mobile:ready
# Open Android Studio:
#   Dripless Customer/android
#   Dripless Driver/android
# Install debug APKs pointed at staging (VITE_API_BASE_URL baked at build time).
```

Driver native GPS uses `@capacitor/geolocation` plus an Android **location foreground service** (`LocationTrackingService`) so tracking continues while backgrounded / screen-locked. After dependency or native changes run `npm --prefix "Dripless Driver" run mobile:sync`.

## Permissions (Driver)

Confirm the Driver APK requests:

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` (Android 10+)
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS` (Android 13+)
- Persistent notification: “Dripless Driver online”

Grant **Allow all the time** for location and allow the ongoing notification.

Disable battery optimization for Dripless Driver (OEM specific: Samsung / Xiaomi / Huawei).

## Screen-lock / background GPS checklist

| Step | Pass? | Notes |
|------|-------|-------|
| Driver goes online; OS location prompt appears once | ☐ | Capacitor permission dialog |
| Persistent “online” notification appears | ☐ | Foreground service |
| Ops sees live location within 15s | ☐ | |
| Keep Driver app in foreground; drive ~200m; Ops track updates | ☐ | |
| Press Home (app backgrounded); wait 60s; Ops still receives ≥1 GPS tick | ☐ | Must pass with FG service |
| Lock screen 2 minutes; unlock; Ops shows last ping age < 120s or a fresh tick | ☐ | Must pass |
| Toggle battery saver / Data saver; GPS still posts when online | ☐ | |
| Customer tracking page shows driver marker while Driver is backgrounded | ☐ | |
| Airplane mode 30s then restore; queued GPS flushes | ☐ | Offline location queue |
| Kill Driver app from recents; Ops marks driver GPS stale (>120s) | ☐ | Expected |

**Pass criteria:** foreground + background + lock-screen GPS must update Ops and Customer. Kill-from-recents may stop tracking (process gone) — that is expected without a separate always-on OEM exemption.

## Evidence

Attach Ops screenshots (driver map + last-seen timestamps) and phone timestamps to the pilot folder (`docs/WASH_PILOT_LOG.md`).
