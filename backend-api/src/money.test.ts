import { describe, expect, it } from 'vitest';
import { fromCents, toCents } from './money.js';

describe('money cents', () => {
  it('round-trips ZAR decimals without float drift', () => {
    expect(toCents(15.99)).toBe(1599);
    expect(fromCents(1599)).toBe(15.99);
    expect(toCents(18.5)).toBe(1850);
    expect(fromCents(50_00)).toBe(50);
  });
});
