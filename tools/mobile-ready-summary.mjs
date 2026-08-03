import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const apps = [
  {
    name: 'Customer',
    aabPath: 'Dripless Customer/android/app/build/outputs/bundle/release/app-release.aab',
    androidProjectPath: 'Dripless Customer/android',
    iosProjectPath: 'Dripless Customer/ios/App/App.xcodeproj'
  },
  {
    name: 'Driver',
    aabPath: 'Dripless Driver/android/app/build/outputs/bundle/release/app-release.aab',
    androidProjectPath: 'Dripless Driver/android',
    iosProjectPath: 'Dripless Driver/ios/App/App.xcodeproj'
  }
];

console.log('\nMobile release readiness summary:\n');

for (const app of apps) {
  const aabAbsolute = resolve(root, app.aabPath);
  const aabExists = existsSync(aabAbsolute);

  console.log(`[${app.name}]`);
  console.log(`- Android project: ${app.androidProjectPath}`);
  console.log(`- iOS project: ${app.iosProjectPath}`);
  console.log(`- Signed AAB present: ${aabExists ? 'YES' : 'NO (build release bundle next)'}`);
  console.log(`- AAB expected path: ${app.aabPath}\n`);
}

console.log('Next steps:');
console.log('- Android: generate signed .aab in Android Studio, then upload to Play Console');
console.log('- iOS (macOS): archive in Xcode, then upload to App Store Connect');
console.log('- Use APP_STORE_METADATA_CHECKLIST.md before final submission\n');
