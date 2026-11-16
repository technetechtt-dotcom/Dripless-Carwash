import { spawn } from 'node:child_process';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { invoiceNumber } from '../lib/ids.js';
import { fromCents } from '../money.js';
import { storePrivateBuffer } from '../evidence/storage.js';

async function renderInvoice(payload: Record<string, unknown>) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(env.PYTHON_BIN, [env.INVOICE_RENDERER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Invoice renderer failed: ${Buffer.concat(errors).toString('utf8').slice(0, 1000)}`));
        return;
      }
      resolve(Buffer.concat(output));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function issueInvoiceForPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { include: { customerProfile: true } },
      booking: true
    }
  });
  if (!payment || payment.status !== 'PAID') return null;
  let invoice = await prisma.invoice.findFirst({ where: { paymentId } });
  if (!invoice) {
    const subtotalCents = env.VAT_RATE_BPS
      ? Math.round((payment.amountZar * 10_000) / (10_000 + env.VAT_RATE_BPS))
      : payment.amountZar;
    invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber(),
        userId: payment.userId,
        bookingId: payment.bookingId,
        paymentId: payment.id,
        status: 'PAID',
        subtotalCents,
        taxCents: payment.amountZar - subtotalCents,
        totalCents: payment.amountZar,
        paidAt: payment.paidAt ?? new Date()
      }
    });
  }
  if (!invoice.pdfUrl) {
    const pdf = await renderInvoice({
      number: invoice.number,
      issuedAt: invoice.issuedAt.toISOString().slice(0, 10),
      paidAt: invoice.paidAt?.toISOString().slice(0, 10),
      customerName: payment.user.customerProfile?.name || payment.user.email,
      customerEmail: payment.user.email,
      bookingReference: payment.booking?.reference,
      description: payment.booking
        ? `${payment.booking.serviceName} - ${payment.booking.optionName}`
        : 'Dripless service',
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      provider: payment.provider,
      paymentReference: payment.externalRef || payment.id,
      vatNumber: env.VAT_NUMBER || undefined
    });
    const stored = await storePrivateBuffer({
      scopeId: invoice.id,
      kind: 'invoice.pdf',
      buffer: pdf,
      mimeType: 'application/pdf'
    });
    invoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: stored.key }
    });
  }
  return invoice;
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
  pdfUrl?: string | null;
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
    bookingId: row.bookingId,
    downloadPath: row.pdfUrl ? `/invoices/${row.id}/download` : null
  };
}
