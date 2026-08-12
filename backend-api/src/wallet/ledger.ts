import type { Prisma, WalletEntryType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

type Db = Prisma.TransactionClient;

export async function applyWalletEntry(
  tx: Db,
  input: {
    userId: string;
    type: WalletEntryType;
    amountCents: number;
    reference?: string;
    bookingId?: string | null;
    paymentId?: string | null;
    promoCode?: string | null;
    note?: string;
  }
) {
  const customer = await tx.customerProfile.findUnique({ where: { userId: input.userId } });
  if (!customer) throw new HttpError(404, 'Customer wallet not found');

  const delta =
    input.type === 'DEBIT' || input.type === 'PAYMENT' || input.type === 'PAYOUT'
      ? -Math.abs(input.amountCents)
      : Math.abs(input.amountCents);

  const next = customer.walletBalance + delta;
  if (next < 0) throw new HttpError(400, 'Insufficient wallet balance');

  await tx.customerProfile.update({
    where: { id: customer.id },
    data: { walletBalance: next }
  });
  return tx.walletLedgerEntry.create({
    data: {
      userId: input.userId,
      type: input.type,
      amountCents: delta,
      balanceAfter: next,
      reference: input.reference,
      bookingId: input.bookingId ?? undefined,
      paymentId: input.paymentId ?? undefined,
      promoCode: input.promoCode ?? undefined,
      note: input.note
    }
  });
}

export async function creditWallet(input: {
  userId: string;
  amountCents: number;
  type?: WalletEntryType;
  reference?: string;
  bookingId?: string | null;
  paymentId?: string | null;
  promoCode?: string | null;
  note?: string;
}) {
  return prisma.$transaction((tx) =>
    applyWalletEntry(tx, {
      ...input,
      type: input.type || 'CREDIT'
    })
  );
}

export async function debitWallet(input: {
  userId: string;
  amountCents: number;
  reference?: string;
  bookingId?: string | null;
  paymentId?: string | null;
  note?: string;
}) {
  return prisma.$transaction((tx) =>
    applyWalletEntry(tx, {
      ...input,
      type: 'PAYMENT'
    })
  );
}

export function mapLedgerDto(row: {
  id: string;
  type: string;
  amountCents: number;
  balanceAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    type: row.type,
    amountZar: fromCents(row.amountCents),
    amountCents: row.amountCents,
    balanceZar: fromCents(row.balanceAfter),
    reference: row.reference,
    note: row.note,
    createdAt: row.createdAt.toISOString()
  };
}
