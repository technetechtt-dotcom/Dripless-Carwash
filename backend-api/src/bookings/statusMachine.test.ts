import { describe, expect, it } from 'vitest';
import { assertStatusTransition } from './statusMachine.js';

describe('booking status machine', () => {
  it('allows the production wash flow and rejects status jumps', () => {
    expect(() => assertStatusTransition('CONFIRMED', 'EN_ROUTE')).not.toThrow();
    expect(() => assertStatusTransition('EN_ROUTE', 'ARRIVED')).not.toThrow();
    expect(() => assertStatusTransition('ARRIVED', 'IN_PROGRESS')).not.toThrow();
    expect(() => assertStatusTransition('IN_PROGRESS', 'COMPLETED')).not.toThrow();
    expect(() => assertStatusTransition('PENDING', 'COMPLETED')).toThrow('Invalid status transition');
    expect(() => assertStatusTransition('COMPLETED', 'IN_PROGRESS')).toThrow('Invalid status transition');
  });
});
