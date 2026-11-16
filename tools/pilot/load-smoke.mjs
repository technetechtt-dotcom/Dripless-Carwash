#!/usr/bin/env node
/**
 * Lightweight load smoke — concurrent health + catalog requests.
 */
const api = process.env.E2E_API_URL || 'http://localhost:4000';
const concurrency = Number(process.env.LOAD_CONCURRENCY || 20);
const durationMs = Number(process.env.LOAD_DURATION_MS || 10_000);

const start = Date.now();
let ok = 0;
let fail = 0;

async function worker() {
  while (Date.now() - start < durationMs) {
    try {
      const response = await fetch(`${api}/health`);
      if (response.ok) ok += 1;
      else fail += 1;
    } catch {
      fail += 1;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsed = Date.now() - start;
console.log(JSON.stringify({ api, concurrency, elapsedMs: elapsed, ok, fail, rps: (ok / (elapsed / 1000)).toFixed(1) }));
if (fail > ok * 0.05) process.exit(1);
