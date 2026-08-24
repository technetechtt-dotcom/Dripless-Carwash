/**
 * Shared ZAR currency formatting for Customer / Driver / Ops.
 * Prefer this over `$` or ad-hoc toFixed strings.
 */

const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatZar(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return zarFormatter.format(Number.isFinite(num) ? num : 0);
}

export function formatZarSigned(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const abs = formatZar(Math.abs(num));
  if (num > 0) return `+${abs}`;
  if (num < 0) return `-${abs.replace(/^-/, '')}`;
  return abs;
}
