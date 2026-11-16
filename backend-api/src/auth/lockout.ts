const LOCK_THRESHOLDS = [
  { failures: 5, lockMinutes: 5 },
  { failures: 8, lockMinutes: 15 },
  { failures: 12, lockMinutes: 60 }
];

export function computeLockUntil(failedLoginCount: number): Date | null {
  let lockMinutes = 0;
  for (const threshold of LOCK_THRESHOLDS) {
    if (failedLoginCount >= threshold.failures) {
      lockMinutes = threshold.lockMinutes;
    }
  }
  if (!lockMinutes) return null;
  return new Date(Date.now() + lockMinutes * 60_000);
}

export function progressiveDelayMs(failedLoginCount: number) {
  if (failedLoginCount <= 2) return 0;
  return Math.min(5000, (failedLoginCount - 2) * 400);
}

export async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
