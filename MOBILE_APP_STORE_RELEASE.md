# Mobile App Store Release (Customer + Driver)

Both apps are now configured as native Capacitor projects and can be published to the app stores.

Quick command reference: `MOBILE_RELEASE_COMMANDS.md`

## Apps

- Customer app: `Dripless Customer`
- Driver app: `Dripless Driver`

Each app now contains:

- `android/` native project (Google Play)
- `ios/` native project (Apple App Store)
- `capacitor.config.ts`
- PWA manifest/service worker setup for mobile web install support

## Build and sync web assets

Run from each app directory:

```bash
npm run build
npm run mobile:sync
```

## Version strategy (recommended)

### Android

Release builds now support version overrides via Gradle properties:

```bash
cd android
./gradlew bundleRelease -PappVersionCode=2 -PappVersionName=1.0.1
```

(`gradlew.bat` on Windows)

### iOS

Update these Xcode target values before archive:

- `MARKETING_VERSION` (e.g. `1.0.1`)
- `CURRENT_PROJECT_VERSION` (e.g. `2`)

## Android (Google Play)

Run from each app directory:

```bash
npm run mobile:android
```

Then in Android Studio:

1. Set app ID/package name if needed.
2. Set version code and version name.
3. Copy `keystore.properties.example` to `keystore.properties` in each app's `android/` folder and fill real values.
4. Generate signed release bundle (`Build > Generate Signed Bundle / APK`).
5. Upload `.aab` to Google Play Console.

### Android signing placeholders already prepared

- Customer: `Dripless Customer/android/keystore.properties.example`
- Driver: `Dripless Driver/android/keystore.properties.example`

The Gradle release build now automatically uses `keystore.properties` when present.

## iOS (App Store)

Run from each app directory:

```bash
npm run mobile:ios
```

Then on macOS with Xcode:

1. Open generated iOS workspace/project.
2. Set Bundle Identifier, Team, signing certificate, and provisioning profile.
3. Set version and build number.
4. Archive and upload to App Store Connect.

### App identifiers configured

- Customer package/bundle ID: `com.dripless.customer`
- Driver package/bundle ID: `com.dripless.driver`

## Recommended next production tasks

- Replace SVG placeholder app icons and splash screens with final brand assets.
- Add push notifications and deep linking if required.
- Validate auth/session behavior on real devices.
- Configure privacy labels, permission strings, and store listings.
