/** All persisted money is integer cents. API responses expose ZAR decimals. */

export const ZAR = 'ZAR';

export function toCents(zar: number | string | null | undefined): number {
  if (zar == null || zar === '') return 0;
  const n = typeof zar === 'string' ? Number(zar) : zar;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number | null | undefined): number {
  const n = Number(cents || 0);
  return Number((n / 100).toFixed(2));
}

export function assertPositiveCents(cents: number, label = 'amount') {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`${label} must be a non-negative integer cent amount`);
  }
}

export function formatZar(cents: number): string {
  return `R${fromCents(cents).toFixed(2)}`;
}
