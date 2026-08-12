import { prisma } from '../db/prisma.js';
import { invoiceNumber } from '../lib/ids.js';
import { fromCents } from '../money.js';

export async function issueInvoiceForPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'PAID') return null;
  const existing = await prisma.invoice.findFirst({ where: { paymentId } });
  if (existing) return existing;
  return prisma.invoice.create({
    data: {
      number: invoiceNumber(),
      userId: payment.userId,
      bookingId: payment.bookingId,
      paymentId: payment.id,
      status: 'PAID',
      subtotalCents: payment.amountZar,
      taxCents: 0,
      totalCents: payment.amountZar,
      paidAt: payment.paidAt ?? new Date()
    }
  });
}

export function mapInvoiceDto(row: {
  id: string;
  number: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  issuedAt: Date;
  paidAt: Date | null;
  bookingId: string | null;
}) {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    subtotalZar: fromCents(row.subtotalCents),
    taxZar: fromCents(row.taxCents),
    totalZar: fromCents(row.totalCents),
    currency: row.currency,
    issuedAt: row.issuedAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    bookingId: row.bookingId
  };
}
