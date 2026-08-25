# Android field test — screen lock & background GPS

Use two physical Android phones (Customer + Driver) against staging. This cannot run in CI.

## Build / install

```bash
npm run mobile:ready
# Then open Android Studio projects:
#   Dripless Customer/android
#   Dripless Driver/android
# Install debug APKs on two phones pointed at staging (VITE_API_BASE_URL baked at build time).
```

## Permissions (Driver)

Confirm the Driver APK requests:

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` (Android 10+)
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION` when a background location plugin is enabled

Grant **Allow all the time** for location on the Driver phone.

## Screen-lock / background GPS checklist

| Step | Pass? | Notes |
|------|-------|-------|
| Driver goes online; Ops sees live location within 15s | ☐ | |
| Keep Driver app in foreground; drive ~200m; Ops track updates | ☐ | |
| Press Home (app backgrounded); wait 60s; Ops still receives ≥1 GPS tick | ☐ | |
| Lock screen 2 minutes; unlock; Ops shows last ping age < 120s or a fresh tick | ☐ | |
| Toggle battery saver / Data saver; GPS still posts when online | ☐ | |
| Customer tracking page shows driver marker while Driver is backgrounded | ☐ | |
| Kill Driver app from recents; Ops marks driver GPS stale (>120s) | ☐ | |

**Pass criteria:** background + lock-screen rows pass without keeping the Driver WebView in the foreground.

## Known limitation

The Driver app currently uses `navigator.geolocation.watchPosition` (foreground-friendly). True screen-off tracking on Android requires a Capacitor background geolocation / foreground-service plugin. Until that lands, record any failures here and do not expand the pilot on GPS-dependent dispatch alone.

## Evidence

Attach Ops screenshots (driver map + last-seen timestamps) and phone timestamps to the pilot folder.
