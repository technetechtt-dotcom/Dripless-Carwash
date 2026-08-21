# Ozow payment integration

Primary Customer checkout method is **Ozow instant EFT**.

## Merchant setup (dash.ozow.com)

1. Create / select a Site and copy **SiteCode**
2. Copy **ApiKey** and **PrivateKey** (merchant details)
3. Register Notify URL: `https://<public-api-host>/payments/webhooks/ozow`
4. Enable test mode while integrating (`OZOW_IS_TEST=true`)

## Backend env

```
PAYMENTS_PROVIDER=ozow
OZOW_SITE_CODE=...
OZOW_API_KEY=...
OZOW_PRIVATE_KEY=...
OZOW_NOTIFY_URL=https://api.example.co.za/payments/webhooks/ozow
OZOW_API_BASE_URL=https://api.ozow.com
OZOW_IS_TEST=true
PUBLIC_API_URL=https://api.example.co.za
CUSTOMER_APP_URL=https://app.example.co.za
```

## Flow

1. Customer books → `POST /payments/intent` with `provider: ozow`
2. API calls Ozow `POST /postpaymentrequest` (ApiKey + SHA512 HashCheck)
3. Customer is redirected to Ozow bank selection (`checkoutUrl`)
4. Ozow POSTs signed notification to `/payments/webhooks/ozow`
5. API verifies Hash, amount, and marks payment PAID (idempotent)
6. Browser returns to `/payment/return?provider=ozow&status=...`

## Security checks

- Notify signature: SHA512 over documented fields + private key (timing-safe compare)
- Duplicate `TransactionId` events are ignored via webhook receipts
- Wrong amount rejected by `applyPaymentSuccess`
- Live keys only when `OZOW_IS_TEST=false` and `NODE_ENV=production`

## Local test without Ozow credentials

Use `PAYMENTS_PROVIDER=stub` and the stub webhook for development.
Ozow intent creation returns 503 until SiteCode/ApiKey/PrivateKey are set.
