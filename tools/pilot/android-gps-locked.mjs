#!/usr/bin/env node
/**
 * P0 — Android locked-screen background GPS for Driver.
 */
import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

try {
  const devices = run('adb devices').split('\n').slice(1).filter((line) => line.includes('device'));
  if (devices.length === 0) {
    console.error('No Android device. Connect handset with USB debugging enabled.');
    process.exit(process.env.PILOT_STRICT === '1' ? 1 : 0);
  }
  console.log('Device(s):', devices.join(', '));
  console.log('\nLocked-screen GPS test procedure:');
  console.log('  1. npm run mobile:ready && install Driver APK');
  console.log('  2. Log in driver, go online, accept active booking');
  console.log('  3. Lock screen for 5 minutes while moving (or simulate via adb geo fix)');
  console.log('  4. Verify Ops dispatch map + customer tracking still receive location updates');
  console.log('\nSimulate location:');
  console.log('  adb shell am start -a android.intent.action.VIEW');
  console.log('  adb emu geo fix 28.0567 -26.1076   # or: adb shell cmd location set-location ...');
} catch (error) {
  console.error('adb not available:', error instanceof Error ? error.message : error);
  process.exit(process.env.PILOT_STRICT === '1' ? 1 : 0);
}
