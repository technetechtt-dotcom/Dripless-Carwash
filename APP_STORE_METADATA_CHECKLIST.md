# App Store Metadata Checklist

Use this checklist when preparing both mobile apps for store submission.

## Customer App (`com.dripless.customer`)

- App name: Dripless Customer
- Subtitle/short description
- Full description
- Primary category / secondary category
- Privacy policy URL
- Support URL
- Marketing URL (optional)
- App icon (1024x1024), no transparency
- Screenshots:
  - iPhone 6.7"
  - iPhone 6.5"
  - iPad sizes (if iPad support is enabled)
  - Android phone
  - Android tablet (optional)
- Feature graphic (Google Play)
- Promo video (optional)
- Keywords (iOS)
- Content rating questionnaire
- Age rating
- Pricing and availability
- Contact details for review team
- Demo account for review (if login required)

## Driver App (`com.dripless.driver`)

- App name: Dripless Driver
- Subtitle/short description
- Full description
- Primary category / secondary category
- Privacy policy URL
- Support URL
- Marketing URL (optional)
- App icon (1024x1024), no transparency
- Screenshots:
  - iPhone 6.7"
  - iPhone 6.5"
  - iPad sizes (if iPad support is enabled)
  - Android phone
  - Android tablet (optional)
- Feature graphic (Google Play)
- Promo video (optional)
- Keywords (iOS)
- Content rating questionnaire
- Age rating
- Pricing and availability
- Contact details for review team
- Demo account for review (if login required)

## Data Safety and Privacy

- Map all collected data types to app features:
  - Location
  - Contact info
  - Identifiers
  - Diagnostics
- Mark whether each data type is:
  - Collected
  - Shared
  - Required for app functionality
- Ensure permission prompts and privacy policy language match actual behavior.

## Versioning Before Submission

- Android:
  - increment `versionCode`
  - update `versionName`
- iOS:
  - increment `CURRENT_PROJECT_VERSION` (build)
  - update `MARKETING_VERSION` (version)

## Final Pre-Submit Checks

- Release build runs on physical Android and iOS devices.
- Login, booking/job flow, notifications, and location workflows tested.
- Crash-free smoke test completed.
- Store listing text matches in-app capabilities.
