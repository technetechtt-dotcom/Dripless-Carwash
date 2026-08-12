import { describe, expect, it } from 'vitest';
import {
  formatActivityMessage,
  formatBookingRef,
  formatPersonName,
  formatPhoneMasked,
  formatShortId,
  humanizeActivityType,
  minutesLabel
} from './formatters';

describe('ops formatters', () => {
  it('builds human booking references', () => {
    expect(formatBookingRef({ id: 'booking_ab12cd34', createdAt: '2026-08-03T10:00:00.000Z' })).toBe(
      'DRP-20260803-CD34'
    );
  });

  it('shortens person names', () => {
    expect(formatPersonName('Sarah Mthembu')).toBe('Sarah M.');
    expect(formatPersonName('')).toBe('Unknown');
  });

  it('masks phone numbers', () => {
    expect(formatPhoneMasked('0721231940')).toBe('072 *** 1940');
  });

  it('formats short ids and activity copy', () => {
    expect(formatShortId('driver_xyz123abc', 'DRV')).toMatch(/^DRV-/);
    expect(humanizeActivityType('BOOKING_ASSIGNED')).toBe('Booking Assigned');
    expect(minutesLabel(90)).toBe('1h 30m');
  });

  it('humanizes activity messages', () => {
    const message = formatActivityMessage({
      id: '1',
      type: 'BOOKING_ASSIGNED',
      actorId: 'ops_admin_001',
      actorRole: 'ops_admin',
      targetId: 'booking_1',
      message: '',
      createdAt: new Date().toISOString()
    });
    expect(message).toContain('Booking Assigned');
  });
});
