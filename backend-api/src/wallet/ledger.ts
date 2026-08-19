import type { Prisma, WalletEntryType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

type Db = Prisma.TransactionClient;

function isRetryableTransaction(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}

async function serializable<T>(work: (tx: Db) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout: 30_000
      });
    } catch (error) {
      if (!isRetryableTransaction(error) || attempt === 2) throw error;
    }
  }
  throw new Error('Serializable wallet transaction failed');
}

export async function applyWalletEntry(
  tx: Db,
  input: {
    userId: string;
    type: WalletEntryType;
    amountCents: number;
    reference?: string;
    idempotencyKey?: string;
    bookingId?: string | null;
    paymentId?: string | null;
    promoCode?: string | null;
    note?: string;
  }
) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new HttpError(400, 'Wallet amount must be a positive integer number of cents');
  }
  if (input.idempotencyKey) {
    const existing = await tx.walletLedgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) {
      if (existing.userId !== input.userId || Math.abs(existing.amountCents) !== input.amountCents) {
        throw new HttpError(409, 'Wallet idempotency key was reused with different parameters');
      }
      return existing;
    }
  }

  const customer = await tx.customerProfile.findUnique({ where: { userId: input.userId } });
  if (!customer) throw new HttpError(404, 'Customer wallet not found');

  let cashBalance = customer.walletCashBalance;
  let promoBalance = customer.walletPromoBalance;
  const debit = ['DEBIT', 'PAYMENT', 'PAYOUT'].includes(input.type);

  if (debit) {
    if (input.type === 'PAYMENT') {
      const promoUsed = Math.min(promoBalance, input.amountCents);
      promoBalance -= promoUsed;
      const cashRequired = input.amountCents - promoUsed;
      if (cashBalance < cashRequired) throw new HttpError(400, 'Insufficient wallet balance');
      cashBalance -= cashRequired;
    } else {
      // Promotional funds may pay for services but can never be withdrawn or paid out.
      if (cashBalance < input.amountCents) {
        throw new HttpError(400, 'Insufficient withdrawable wallet balance');
      }
      cashBalance -= input.amountCents;
    }
  } else if (input.type === 'PROMO_CREDIT') {
    promoBalance += input.amountCents;
  } else {
    cashBalance += input.amountCents;
  }

  const delta = debit ? -input.amountCents : input.amountCents;
  const balanceAfter = cashBalance + promoBalance;
  await tx.customerProfile.update({
    where: { id: customer.id },
    data: {
      walletBalance: balanceAfter,
      walletCashBalance: cashBalance,
      walletPromoBalance: promoBalance
    }
  });
  return tx.walletLedgerEntry.create({
    data: {
      userId: input.userId,
      type: input.type,
      amountCents: delta,
      balanceAfter,
      cashBalanceAfter: cashBalance,
      promoBalanceAfter: promoBalance,
      withdrawable: input.type !== 'PROMO_CREDIT',
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
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
  idempotencyKey?: string;
  bookingId?: string | null;
  paymentId?: string | null;
  promoCode?: string | null;
  note?: string;
}) {
  return serializable((tx) => applyWalletEntry(tx, { ...input, type: input.type || 'CREDIT' }));
}

export async function creditWalletWithApproval(input: {
  approvalId: string;
  userId: string;
  amountCents: number;
  type?: WalletEntryType;
  idempotencyKey: string;
  note?: string;
}) {
  return serializable(async (tx) => {
    const approval = await tx.highRiskApproval.findUnique({ where: { id: input.approvalId } });
    const payload = (approval?.payload || {}) as Record<string, unknown>;
    if (
      !approval ||
      approval.status !== 'APPROVED' ||
      approval.action !== 'WALLET_ADJUSTMENT' ||
      String(payload.userId || '') !== input.userId ||
      Number(payload.maxAmountCents || 0) < input.amountCents
    ) {
      throw new HttpError(403, 'Approved wallet adjustment is required');
    }
    const consumed = await tx.highRiskApproval.updateMany({
      where: { id: approval.id, status: 'APPROVED' },
      data: { status: 'CONSUMED' }
    });
    if (consumed.count !== 1) throw new HttpError(409, 'Approval was already consumed');
    return applyWalletEntry(tx, { ...input, type: input.type || 'CREDIT' });
  });
}

export async function debitWallet(input: {
  userId: string;
  amountCents: number;
  reference?: string;
  idempotencyKey?: string;
  bookingId?: string | null;
  paymentId?: string | null;
  note?: string;
}) {
  return serializable((tx) => applyWalletEntry(tx, { ...input, type: 'PAYMENT' }));
}

export async function reconcileWallets() {
  const profiles = await prisma.customerProfile.findMany({
    select: {
      id: true,
      userId: true,
      walletBalance: true,
      walletCashBalance: true,
      walletPromoBalance: true
    }
  });
  const mismatches: Array<{
    customerId: string;
    profileBalance: number;
    ledgerBalance: number;
    componentBalance: number;
  }> = [];

  for (const profile of profiles) {
    const [aggregate, latest] = await Promise.all([
      prisma.walletLedgerEntry.aggregate({
        where: { userId: profile.userId },
        _sum: { amountCents: true }
      }),
      prisma.walletLedgerEntry.findFirst({
        where: { userId: profile.userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      })
    ]);
    const ledgerBalance = aggregate._sum.amountCents ?? 0;
    const componentBalance = profile.walletCashBalance + profile.walletPromoBalance;
    if (
      ledgerBalance !== profile.walletBalance ||
      componentBalance !== profile.walletBalance ||
      (latest && latest.balanceAfter !== profile.walletBalance)
    ) {
      mismatches.push({
        customerId: profile.id,
        profileBalance: profile.walletBalance,
        ledgerBalance,
        componentBalance
      });
    }
  }
  return { checked: profiles.length, mismatches };
}

export function mapLedgerDto(row: {
  id: string;
  type: string;
  amountCents: number;
  balanceAfter: number;
  cashBalanceAfter: number;
  promoBalanceAfter: number;
  withdrawable: boolean;
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
    cashBalanceZar: fromCents(row.cashBalanceAfter),
    promoBalanceZar: fromCents(row.promoBalanceAfter),
    withdrawable: row.withdrawable,
    reference: row.reference,
    note: row.note,
    createdAt: row.createdAt.toISOString()
  };
}
