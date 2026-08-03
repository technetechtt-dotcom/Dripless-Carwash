# Mobile Release Commands

Use these commands from the workspace root.

## One-command readiness check

```bash
npm run mobile:ready
```

This command:

- builds Customer + Driver web bundles
- syncs Capacitor native projects
- runs cross-app mobile preflight checks
- prints a release-readiness summary

## 1) Build web bundles

```bash
npm --prefix "Dripless Customer" run build
npm --prefix "Dripless Driver" run build
```

## 2) Sync web bundles into native apps

```bash
npm --prefix "Dripless Customer" run mobile:sync
npm --prefix "Dripless Driver" run mobile:sync
```

## 3) Run preflight checks (both apps)

```bash
npm run mobile:preflight
```

## 4) Android release bundle (Windows)

Customer:

```bash
cd "Dripless Customer/android"
gradlew.bat bundleRelease -PappVersionCode=2 -PappVersionName=1.0.1
```

Driver:

```bash
cd "Dripless Driver/android"
gradlew.bat bundleRelease -PappVersionCode=2 -PappVersionName=1.0.1
```

Output `.aab` location (both apps):

`android/app/build/outputs/bundle/release/`

## 5) Open native projects

Android Studio:

```bash
npm --prefix "Dripless Customer" run mobile:android
npm --prefix "Dripless Driver" run mobile:android
```

Xcode (macOS only):

```bash
npm --prefix "Dripless Customer" run mobile:ios
npm --prefix "Dripless Driver" run mobile:ios
```

## 6) iOS release versioning in Xcode

Per app target, set:

- `MARKETING_VERSION` (e.g. `1.0.1`)
- `CURRENT_PROJECT_VERSION` (e.g. `2`)

Then Archive and upload through Organizer.
