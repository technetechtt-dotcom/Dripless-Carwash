/**
 * Centralized date/time and address formatting utilities.
 * Use these everywhere instead of raw string manipulation.
 */

export const formatDate = (
date: string | Date,
options: Intl.DateTimeFormatOptions = {}) =>
{
  try {
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(date));
  } catch {
    return typeof date === 'string' ? date : 'Invalid date';
  }
};

export const formatDateOnly = (
date: string | Date,
options: Intl.DateTimeFormatOptions = {}) =>
{
  try {
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'medium',
      ...options
    }).format(new Date(date));
  } catch {
    return typeof date === 'string' ? date : 'Invalid date';
  }
};

export const formatTimeOnly = (
date: string | Date,
options: Intl.DateTimeFormatOptions = {}) =>
{
  try {
    return new Intl.DateTimeFormat('en-ZA', {
      timeStyle: 'short',
      ...options
    }).format(new Date(date));
  } catch {
    return typeof date === 'string' ? date : 'Invalid time';
  }
};

export const relativeTime = (date: string | Date): string => {
  try {
    const now = Date.now();
    const target = new Date(date).getTime();
    const diffMs = target - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    return rtf.format(diffDay, 'day');
  } catch {
    return typeof date === 'string' ? date : 'Unknown';
  }
};

export const formatAddress = (addr?: string): string =>
addr ? addr.replace(/,\s*/g, ', ').trim() : 'Location not set';