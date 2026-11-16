import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = resolve(process.cwd());

const apps = [
  {
    name: 'Customer',
    dir: 'Dripless Customer',
    appId: 'com.dripless.customer',
    appName: 'Dripless Customer'
  },
  {
    name: 'Driver',
    dir: 'Dripless Driver',
    appId: 'com.dripless.driver',
    appName: 'Dripless Driver'
  }
];

const requiredFiles = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/keystore.properties.example',
  'ios/App/App/Info.plist',
  'ios/App/App.xcodeproj/project.pbxproj',
  'dist/manifest.webmanifest',
  'dist/sw.js'
];

const checks = [
  {
    file: 'capacitor.config.ts',
    validate: (content, app) =>
      content.includes(`appId: '${app.appId}'`) && content.includes(`appName: '${app.appName}'`),
    error: (app) => `Missing appId/appName values in capacitor config for ${app.name}`
  },
  {
    file: 'android/app/src/main/AndroidManifest.xml',
    validate: (content) =>
      content.includes('android.permission.ACCESS_FINE_LOCATION') &&
      content.includes('android.permission.POST_NOTIFICATIONS'),
    error: () => 'Android manifest is missing required location/notification permissions'
  },
  {
    file: 'ios/App/App/Info.plist',
    validate: (content) =>
      content.includes('NSLocationWhenInUseUsageDescription') &&
      content.includes('NSUserNotificationsUsageDescription'),
    error: () => 'iOS Info.plist is missing required usage description keys'
  }
];

let hasFailure = false;

for (const app of apps) {
  const appRoot = resolve(workspaceRoot, app.dir);
  console.log(`\n[${app.name}] Preflight checks`);

  for (const relativePath of requiredFiles) {
    const absolutePath = resolve(appRoot, relativePath);
    if (!existsSync(absolutePath)) {
      console.error(`  FAIL: Missing ${relativePath}`);
      hasFailure = true;
      continue;
    }
    console.log(`  OK: ${relativePath}`);
  }

  for (const check of checks) {
    const absolutePath = resolve(appRoot, check.file);
    if (!existsSync(absolutePath)) continue;
    const content = readFileSync(absolutePath, 'utf8');
    if (!check.validate(content, app)) {
      console.error(`  FAIL: ${check.error(app)}`);
      hasFailure = true;
    } else {
      console.log(`  OK: Content validation for ${check.file}`);
    }
  }
}

if (hasFailure) {
  console.error('\nMobile preflight failed. Fix issues before store submission.');
  process.exit(1);
}

console.log('\nMobile preflight passed for Customer and Driver apps.');
