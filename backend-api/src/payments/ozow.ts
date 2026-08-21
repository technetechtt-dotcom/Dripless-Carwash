import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { fromCents } from '../money.js';

export type OzowInitResult = {
  checkoutUrl: string;
  externalRef: string;
  paymentRequestId?: string;
};

type OzowNotifyFields = {
  SiteCode?: string;
  TransactionId?: string;
  TransactionReference?: string;
  Amount?: string;
  Status?: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  CurrencyCode?: string;
  IsTest?: string | boolean;
  StatusMessage?: string;
  Hash?: string;
  hash?: string;
};

function ozowApiBase() {
  return env.OZOW_API_BASE_URL.replace(/\/$/, '') || 'https://api.ozow.com';
}

function asString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** Ozow amount field is ZAR decimal with 2 places (not cents). */
export function formatOzowAmount(amountCents: number): string {
  return fromCents(amountCents).toFixed(2);
}

/**
 * Concatenate fields in documented order, append private key, lowercase, SHA512.
 * See https://ozow.com/integrations and hub.ozow.com docs.
 */
export function ozowSha512(parts: Array<string | number | boolean | null | undefined>, privateKey: string): string {
  const concat = `${parts.map(asString).join('')}${privateKey}`.toLowerCase();
  return createHash('sha512').update(concat).digest('hex');
}

export function buildOzowPaymentRequestHash(input: {
  siteCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string;
  transactionReference: string;
  bankReference: string;
  cancelUrl: string;
  errorUrl: string;
  successUrl: string;
  notifyUrl: string;
  isTest: boolean;
  privateKey: string;
  customer?: string;
}): string {
  // Only fields we POST, in Ozow table order (optionals omitted when unused).
  // Matches common merchant samples + OpenAPI required set + optional Customer.
  const parts: Array<string | boolean> = [
    input.siteCode,
    input.countryCode,
    input.currencyCode,
    input.amount,
    input.transactionReference,
    input.bankReference
  ];
  if (input.customer) parts.push(input.customer);
  parts.push(
    input.cancelUrl,
    input.errorUrl,
    input.successUrl,
    input.notifyUrl,
    input.isTest
  );
  return ozowSha512(parts, input.privateKey);
}

export function buildOzowNotifyHash(body: OzowNotifyFields, privateKey: string): string {
  return ozowSha512(
    [
      body.SiteCode ?? '',
      body.TransactionId ?? '',
      body.TransactionReference ?? '',
      body.Amount ?? '',
      body.Status ?? '',
      body.Optional1 ?? '',
      body.Optional2 ?? '',
      body.Optional3 ?? '',
      body.Optional4 ?? '',
      body.Optional5 ?? '',
      body.CurrencyCode ?? '',
      body.IsTest ?? '',
      body.StatusMessage ?? ''
    ],
    privateKey
  );
}

function timingSafeHexEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected.toLowerCase(), 'utf8');
  const b = Buffer.from(String(actual || '').toLowerCase(), 'utf8');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function verifyOzowNotifySignature(
  body: Record<string, string | boolean | undefined>,
  privateKey = env.OZOW_PRIVATE_KEY
): boolean {
  if (!privateKey) return !env.isProduction;
  const expected = buildOzowNotifyHash(body as OzowNotifyFields, privateKey);
  const actual = String(body.Hash || body.hash || '');
  return timingSafeHexEqual(expected, actual);
}

export async function initializeOzow(input: {
  paymentId: string;
  amountCents: number;
  customerName?: string;
}): Promise<OzowInitResult> {
  if (!env.OZOW_SITE_CODE || !env.OZOW_API_KEY || !env.OZOW_PRIVATE_KEY) {
    throw new HttpError(503, 'Ozow is not configured (OZOW_SITE_CODE, OZOW_API_KEY, OZOW_PRIVATE_KEY)');
  }

  const amount = formatOzowAmount(input.amountCents);
  const transactionReference = input.paymentId;
  const bankReference = input.paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || input.paymentId.slice(0, 20);
  const customerReturn = `${env.CUSTOMER_APP_URL.replace(/\/$/, '')}/payment-return`;
  const successUrl = `${customerReturn}?provider=ozow&status=success&paymentId=${encodeURIComponent(input.paymentId)}`;
  const cancelUrl = `${customerReturn}?provider=ozow&status=cancelled&paymentId=${encodeURIComponent(input.paymentId)}`;
  const errorUrl = `${customerReturn}?provider=ozow&status=error&paymentId=${encodeURIComponent(input.paymentId)}`;
  const notifyUrl =
    env.OZOW_NOTIFY_URL ||
    `${env.PUBLIC_API_URL.replace(/\/$/, '')}/payments/webhooks/ozow`;

  const isTest = env.OZOW_IS_TEST || !env.isProduction;
  const payload: Record<string, string | boolean> = {
    SiteCode: env.OZOW_SITE_CODE,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: amount,
    TransactionReference: transactionReference,
    BankReference: bankReference,
    CancelUrl: cancelUrl,
    ErrorUrl: errorUrl,
    SuccessUrl: successUrl,
    NotifyUrl: notifyUrl,
    IsTest: isTest
  };
  if (input.customerName) {
    payload.Customer = input.customerName.slice(0, 100);
  }

  const hashCheck = buildOzowPaymentRequestHash({
    siteCode: env.OZOW_SITE_CODE,
    countryCode: 'ZA',
    currencyCode: 'ZAR',
    amount,
    transactionReference,
    bankReference,
    cancelUrl,
    errorUrl,
    successUrl,
    notifyUrl,
    isTest,
    privateKey: env.OZOW_PRIVATE_KEY,
    customer: input.customerName?.slice(0, 100)
  });
  payload.HashCheck = hashCheck;

  const response = await fetch(`${ozowApiBase()}/postpaymentrequest`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ApiKey: env.OZOW_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json().catch(() => ({}))) as {
    paymentRequestId?: string;
    url?: string;
    errorMessage?: string | null;
  };

  if (!response.ok || !body.url) {
    throw new HttpError(502, body.errorMessage || 'Ozow payment request failed');
  }

  return {
    checkoutUrl: body.url,
    externalRef: body.paymentRequestId || transactionReference,
    paymentRequestId: body.paymentRequestId
  };
}

export async function verifyOzowTransactionByReference(transactionReference: string) {
  if (!env.OZOW_SITE_CODE || !env.OZOW_API_KEY) return null;
  const url = new URL(`${ozowApiBase()}/GetTransactionByReference`);
  url.searchParams.set('siteCode', env.OZOW_SITE_CODE);
  url.searchParams.set('transactionReference', transactionReference);
  if (env.OZOW_IS_TEST || !env.isProduction) {
    url.searchParams.set('isTest', 'true');
  }
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ApiKey: env.OZOW_API_KEY
    }
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as
    | Array<{
        TransactionId?: string;
        TransactionReference?: string;
        Amount?: number | string;
        Status?: string;
        CurrencyCode?: string;
      }>
    | null;
  if (!Array.isArray(body) || body.length === 0) return null;
  // Prefer the latest Complete transaction if duplicates exist.
  const complete = body.find((row) => String(row.Status || '').toLowerCase() === 'complete');
  return complete || body[0];
}

export function ozowStatusIsPaid(status: string | undefined | null): boolean {
  const normalised = String(status || '').toLowerCase();
  return normalised === 'complete' || normalised === 'success';
}

export function ozowAmountMatches(expectedCents: number, providerAmount: number | string, currency?: string): boolean {
  if (currency && String(currency).toUpperCase() !== 'ZAR') return false;
  const providerCents = Math.round(Number(providerAmount) * 100);
  return Number.isFinite(providerCents) && providerCents === expectedCents;
}
