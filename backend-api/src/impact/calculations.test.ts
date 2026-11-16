import { describe, expect, it } from 'vitest';
import {
  computeEcoStreakDays,
  estimateCo2KgSaved,
  estimatePlasticKgReduced,
  estimateProjectedCo2KgYear
} from './calculations.js';

describe('impact calculations', () => {
  it('derives CO2 and plastic from operational counts', () => {
    expect(estimateCo2KgSaved(100)).toBe(3.6);
    expect(estimatePlasticKgReduced(3)).toBe(1.3);
  });

  it('computes eco streak from consecutive completion days', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(computeEcoStreakDays([today, yesterday])).toBeGreaterThanOrEqual(2);
  });

  it('projects annual CO2 from monthly activity', () => {
    const now = new Date();
    const projected = estimateProjectedCo2KgYear([now, now], 10);
    expect(projected).toBeGreaterThan(0);
  });
});
