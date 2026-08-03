/**
 * Centralized currency and points formatting.
 * Use formatCurrency() everywhere instead of `$${price.toFixed(2)}`.
 */

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// For display as "R 24.99"
export const formatZAR = (amount: number | string): string =>
currencyFormatter.format(
  typeof amount === 'string' ? parseFloat(amount) || 0 : amount
);

// For display as "$24.99" (current app convention)
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return `$${Math.abs(num).toFixed(2)}`;
};

// For signed display: "+$50.00" or "-$24.99"
export const formatSignedCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

// Format eco points: "1,250"
export const formatPoints = (points: number): string =>
points.toLocaleString('en-ZA');