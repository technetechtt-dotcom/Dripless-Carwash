import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPoints, formatSignedCurrency } from './currency';

describe('currency utils', () => {
  it('formats unsigned ZAR without dollar signs', () => {
    expect(formatCurrency(12.5)).toMatch(/12[.,]50/);
    expect(formatCurrency(12.5)).not.toMatch(/\$/);
    expect(formatCurrency(-7)).toMatch(/7[.,]00/);
  });

  it('formats signed ZAR with direction', () => {
    expect(formatSignedCurrency(50)).toMatch(/^\+/);
    expect(formatSignedCurrency(50)).toMatch(/50/);
    expect(formatSignedCurrency(-24.99)).toMatch(/^-/);
    expect(formatSignedCurrency(-24.99)).toMatch(/24[.,]99/);
  });

  it('formats points for readability', () => {
    expect(formatPoints(1250)).toContain('1');
  });
});
