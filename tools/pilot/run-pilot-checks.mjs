#!/usr/bin/env node
/**
 * Run all automatable P0/P1 pilot checks.
 * Field/device steps print checklists when env is not configured.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = [
  ['health', 'node', ['tools/health-check.mjs']],
  ['smoke-api', 'node', ['tools/smoke-api.mjs']],
  ['release-backend', 'npm', ['--prefix', 'backend-api', 'test', '--', 'src/release-engineering.test.ts']],
  ['e2e-staged-wash', 'npx', ['playwright', 'test', 'e2e/staged-wash.spec.ts']],
  ['ozow-device', 'node', ['tools/pilot/ozow-sandbox-device.mjs']],
  ['android-gps', 'node', ['tools/pilot/android-gps-locked.mjs']],
  ['fcm', 'node', ['tools/pilot/fcm-push-check.mjs']],
  ['staging-evidence', 'node', ['tools/pilot/staging-evidence-upload.mjs']],
  ['load-smoke', 'node', ['tools/pilot/load-smoke.mjs']],
  ['pentest-baseline', 'node', ['tools/pilot/pentest-baseline.mjs']]
];

let failed = 0;
for (const [name, cmd, args] of scripts) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`FAILED: ${name}`);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
