import { randomBytes } from 'node:crypto';

export function bookingReference(): string {
  return `DPL-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function invoiceNumber(): string {
  const y = new Date().getUTCFullYear();
  return `INV-${y}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export function referralCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'ECO';
  return `${slug}${randomBytes(2).toString('hex').toUpperCase()}`;
}
