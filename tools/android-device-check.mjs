#!/usr/bin/env node
/**
 * Physical Android validation checklist runner.
 * Requires `adb devices` with at least one attached handset and Capacitor builds synced.
 */
import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

try {
  const devices = run('adb devices').split('\n').slice(1).filter((line) => line.includes('device'));
  if (devices.length === 0) {
    console.error('No Android devices detected. Connect a handset and enable USB debugging.');
    process.exit(1);
  }
  console.log('Android devices:', devices.join(', '));
  console.log('Run: npm run mobile:ready');
  console.log('Then open Customer/Driver Android projects and verify login, booking, driver online, and GPS permissions.');
} catch (error) {
  console.error('adb not available:', error instanceof Error ? error.message : error);
  process.exit(1);
}
