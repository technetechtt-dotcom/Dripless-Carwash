import { describe, expect, it } from 'vitest';
import {
  buildOzowNotifyHash,
  buildOzowPaymentRequestHash,
  formatOzowAmount,
  ozowAmountMatches,
  ozowStatusIsPaid,
  verifyOzowNotifySignature
} from './ozow.js';

describe('Ozow payment helpers', () => {
  const privateKey = 'test-private-key';

  it('formats ZAR amounts with two decimal places', () => {
    expect(formatOzowAmount(1599)).toBe('15.99');
    expect(formatOzowAmount(100)).toBe('1.00');
  });

  it('builds a stable payment request hash matching Ozow rules', () => {
    const hash = buildOzowPaymentRequestHash({
      siteCode: 'TST-SITE',
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: '15.99',
      transactionReference: 'pay_123',
      bankReference: 'pay_123',
      cancelUrl: 'https://app.example/cancel',
      errorUrl: 'https://app.example/error',
      successUrl: 'https://app.example/success',
      notifyUrl: 'https://api.example/payments/webhooks/ozow',
      isTest: true,
      privateKey
    });
    expect(hash).toMatch(/^[a-f0-9]{128}$/);
    expect(
      buildOzowPaymentRequestHash({
        siteCode: 'TST-SITE',
        countryCode: 'ZA',
        currencyCode: 'ZAR',
        amount: '15.99',
        transactionReference: 'pay_123',
        bankReference: 'pay_123',
        cancelUrl: 'https://app.example/cancel',
        errorUrl: 'https://app.example/error',
        successUrl: 'https://app.example/success',
        notifyUrl: 'https://api.example/payments/webhooks/ozow',
        isTest: true,
        privateKey
      })
    ).toBe(hash);
  });

  it('verifies notify signatures and rejects tampering', () => {
    const body = {
      SiteCode: 'TST-SITE',
      TransactionId: 'txn-1',
      TransactionReference: 'pay_123',
      Amount: '15.99',
      Status: 'Complete',
      Optional1: '',
      Optional2: '',
      Optional3: '',
      Optional4: '',
      Optional5: '',
      CurrencyCode: 'ZAR',
      IsTest: 'true',
      StatusMessage: ''
    };
    const hash = buildOzowNotifyHash(body, privateKey);
    expect(verifyOzowNotifySignature({ ...body, Hash: hash }, privateKey)).toBe(true);
    expect(verifyOzowNotifySignature({ ...body, Amount: '16.00', Hash: hash }, privateKey)).toBe(false);
  });

  it('recognises Complete as paid and matches amounts in cents', () => {
    expect(ozowStatusIsPaid('Complete')).toBe(true);
    expect(ozowStatusIsPaid('Cancelled')).toBe(false);
    expect(ozowAmountMatches(1599, '15.99', 'ZAR')).toBe(true);
    expect(ozowAmountMatches(1599, '16.00', 'ZAR')).toBe(false);
  });
});
