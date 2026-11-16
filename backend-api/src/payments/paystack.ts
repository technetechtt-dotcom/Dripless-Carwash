import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

export type PaystackInitResult = {
  checkoutUrl: string;
  externalRef: string;
  accessCode?: string;
};

export async function initializePaystack(input: {
  paymentId: string;
  email: string;
  amountCents: number;
  currency: string;
}): Promise<PaystackInitResult> {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new HttpError(503, 'Paystack is not configured');
  }
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountCents,
      currency: input.currency,
      reference: input.paymentId,
      callback_url: env.PAYSTACK_CALLBACK_URL || undefined,
      metadata: { paymentId: input.paymentId }
    })
  });
  const body = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string; access_code?: string };
  };
  if (!response.ok || !body.status || !body.data?.authorization_url) {
    throw new HttpError(502, body.message || 'Paystack initialize failed');
  }
  return {
    checkoutUrl: body.data.authorization_url,
    externalRef: body.data.reference || input.paymentId,
    accessCode: body.data.access_code
  };
}

export function verifyPaystackSignature(
  rawBody: string | Buffer,
  signature: string,
  secret = env.PAYSTACK_SECRET_KEY
): boolean {
  if (!secret) return false;
  const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(hash, 'hex');
  const actual = /^[a-f0-9]{128}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function verifyPaystackTransaction(reference: string) {
  if (!env.PAYSTACK_SECRET_KEY) return null;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } }
  );
  if (!response.ok) return null;
  const body = (await response.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      id?: number;
    };
  };
  return body.data ?? null;
}

export async function refundPaystack(reference: string, amountCents?: number) {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new HttpError(503, 'Paystack refunds are not configured');
  }
  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction: reference,
      amount: amountCents,
      currency: 'ZAR'
    })
  });
  const body = await response.json();
  if (!response.ok) {
    const message = (body as { message?: string }).message || 'Paystack refund failed';
    throw new HttpError(502, message);
  }
  return body;
}

export async function listPaystackSettlements(from: Date, to: Date) {
  if (!env.PAYSTACK_SECRET_KEY) throw new HttpError(503, 'Paystack is not configured');
  const url = new URL('https://api.paystack.co/settlement');
  url.searchParams.set('from', from.toISOString().slice(0, 10));
  url.searchParams.set('to', to.toISOString().slice(0, 10));
  url.searchParams.set('perPage', '100');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` }
  });
  const body = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: Array<{
      id?: number;
      amount?: number;
      total_fees?: number;
      status?: string;
      settlement_date?: string;
    }>;
  };
  if (!response.ok || !body.status) {
    throw new HttpError(502, body.message || 'Paystack settlement fetch failed');
  }
  return body.data ?? [];
}

export async function createPaystackTransferRecipient(input: {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}) {
  if (!env.PAYSTACK_SECRET_KEY) {
    if (env.demoMode) return `RCP_demo_${input.accountNumber.slice(-4)}`;
    throw new HttpError(503, 'Paystack transfers are not configured');
  }
  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'nuban',
      name: input.accountName,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: 'ZAR'
    })
  });
  const body = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { recipient_code?: string };
  };
  if (!response.ok || !body.status || !body.data?.recipient_code) {
    throw new HttpError(502, body.message || 'Paystack recipient verification failed');
  }
  return body.data.recipient_code;
}

export async function initiatePaystackTransfer(input: {
  amountCents: number;
  recipientCode: string;
  reason: string;
  reference: string;
}) {
  if (!env.PAYSTACK_SECRET_KEY) {
    if (env.demoMode) return { transferCode: `TRF_demo_${input.reference}`, status: 'success' };
    throw new HttpError(503, 'Paystack transfers are not configured');
  }
  const response = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'balance',
      amount: input.amountCents,
      recipient: input.recipientCode,
      reason: input.reason,
      reference: input.reference,
      currency: 'ZAR'
    })
  });
  const body = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { transfer_code?: string; status?: string; reference?: string };
  };
  if (!response.ok || !body.status || !body.data?.transfer_code) {
    throw new HttpError(502, body.message || 'Paystack transfer failed');
  }
  return { transferCode: body.data.transfer_code, status: body.data.status || 'pending' };
}

export function paystackAmountMatches(expectedCents: number, providerAmount: number, currency: string) {
  return currency === 'ZAR' && Number(providerAmount) === expectedCents;
}

export function describePaystackAmount(cents: number) {
  return { amountZar: fromCents(cents), amountCents: cents, currency: 'ZAR' };
}
