import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPoints, formatSignedCurrency } from './currency';

describe('currency utils', () => {
  it('formats unsigned currency consistently', () => {
    expect(formatCurrency(12.5)).toBe('$12.50');
    expect(formatCurrency(-7)).toBe('$7.00');
  });

  it('formats signed currency with direction', () => {
    expect(formatSignedCurrency(50)).toBe('+$50.00');
    expect(formatSignedCurrency(-24.99)).toBe('-$24.99');
  });

  it('formats points for readability', () => {
    expect(formatPoints(1250)).toContain('1');
  });
});
