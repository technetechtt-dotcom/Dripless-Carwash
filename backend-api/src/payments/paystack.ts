import { createHmac } from 'node:crypto';
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

export function verifyPaystackSignature(rawBody: string, signature: string): boolean {
  if (!env.PAYSTACK_SECRET_KEY) return false;
  const hash = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  return hash === signature;
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
    return { status: true, data: { id: `stub_refund_${reference}` } };
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
  return response.json();
}

export function paystackAmountMatches(expectedCents: number, providerAmount: number, currency: string) {
  return currency === 'ZAR' && Number(providerAmount) === expectedCents;
}

export function describePaystackAmount(cents: number) {
  return { amountZar: fromCents(cents), amountCents: cents, currency: 'ZAR' };
}
