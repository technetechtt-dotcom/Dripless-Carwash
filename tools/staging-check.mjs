#!/usr/bin/env node
/**
 * Staging integration checklist — run against STAGING_API_URL with real provider keys configured.
 */
const api = process.env.STAGING_API_URL || process.env.E2E_API_URL;
if (!api) {
  console.error('Set STAGING_API_URL to run the staging validation checklist.');
  process.exit(1);
}

const paths = ['/health', '/catalog/services'];
for (const path of paths) {
  const response = await fetch(`${api}${path}`);
  if (!response.ok) {
    console.error(`Staging check failed: ${path} -> ${response.status}`);
    process.exit(1);
  }
  console.log(`OK ${path}`);
}

console.log('Staging smoke passed. Run e2e/staged-wash.spec.ts against staging credentials next.');
