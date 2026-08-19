ALTER TABLE "CustomerProfile"
  ADD COLUMN "walletCashBalance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "walletPromoBalance" INTEGER NOT NULL DEFAULT 0;

UPDATE "CustomerProfile"
SET "walletCashBalance" = "walletBalance";

ALTER TABLE "Booking"
  ADD COLUMN "completionPinVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "completionPinAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completionProofOverrideAt" TIMESTAMP(3),
  ADD COLUMN "completionProofOverrideBy" TEXT,
  ADD COLUMN "completionProofOverrideReason" TEXT;

ALTER TABLE "BookingEvidence"
  ADD COLUMN "uploadStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "BookingEvidence"
SET "verifiedAt" = "createdAt"
WHERE "verifiedAt" IS NULL;

ALTER TABLE "WebhookReceipt"
  ADD COLUMN "paymentId" TEXT,
  ADD COLUMN "eventType" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "WebhookReceipt"
SET "status" = 'PROCESSED', "completedAt" = "processedAt";

ALTER TABLE "Refund"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "destination" TEXT NOT NULL DEFAULT 'PROVIDER';

CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

ALTER TABLE "Chargeback"
  ADD COLUMN "externalRef" TEXT,
  ADD COLUMN "providerEventId" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Chargeback_externalRef_key" ON "Chargeback"("externalRef");
CREATE UNIQUE INDEX "Chargeback_providerEventId_key" ON "Chargeback"("providerEventId");

ALTER TABLE "WalletLedgerEntry"
  ADD COLUMN "cashBalanceAfter" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promoBalanceAfter" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "withdrawable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "WalletLedgerEntry"
SET "cashBalanceAfter" = "balanceAfter";

CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

CREATE TABLE "EvidenceAccessLog" (
  "id" TEXT NOT NULL,
  "evidenceId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EvidenceAccessLog_evidenceId_createdAt_idx" ON "EvidenceAccessLog"("evidenceId", "createdAt");
CREATE INDEX "EvidenceAccessLog_actorId_createdAt_idx" ON "EvidenceAccessLog"("actorId", "createdAt");
ALTER TABLE "EvidenceAccessLog" ADD CONSTRAINT "EvidenceAccessLog_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "BookingEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PaymentReconciliationRun" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "scanned" INTEGER NOT NULL DEFAULT 0,
  "matched" INTEGER NOT NULL DEFAULT 0,
  "mismatched" INTEGER NOT NULL DEFAULT 0,
  "missingProvider" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentReconciliationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentReconciliationRun_provider_startedAt_idx" ON "PaymentReconciliationRun"("provider", "startedAt");
CREATE INDEX "PaymentReconciliationRun_status_idx" ON "PaymentReconciliationRun"("status");

CREATE TABLE "PaymentReconciliationItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "paymentId" TEXT,
  "externalRef" TEXT,
  "expectedCents" INTEGER,
  "providerCents" INTEGER,
  "expectedStatus" TEXT,
  "providerStatus" TEXT,
  "result" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentReconciliationItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentReconciliationItem_runId_result_idx" ON "PaymentReconciliationItem"("runId", "result");
CREATE INDEX "PaymentReconciliationItem_paymentId_idx" ON "PaymentReconciliationItem"("paymentId");
ALTER TABLE "PaymentReconciliationItem" ADD CONSTRAINT "PaymentReconciliationItem_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "PaymentReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProviderSettlement" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "externalRef" TEXT NOT NULL,
  "grossCents" INTEGER NOT NULL,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "netCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "settledAt" TIMESTAMP(3) NOT NULL,
  "reconciledAt" TIMESTAMP(3),
  "sourcePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderSettlement_provider_externalRef_key" ON "ProviderSettlement"("provider", "externalRef");
CREATE INDEX "ProviderSettlement_provider_settledAt_idx" ON "ProviderSettlement"("provider", "settledAt");
CREATE INDEX "ProviderSettlement_reconciledAt_idx" ON "ProviderSettlement"("reconciledAt");

CREATE TABLE "RealtimeEvent" (
  "sequence" BIGSERIAL NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("sequence")
);

CREATE INDEX "RealtimeEvent_createdAt_idx" ON "RealtimeEvent"("createdAt");

ALTER TABLE "DriverLocation"
  ADD COLUMN "sourceTimestamp" TIMESTAMP(3);

ALTER TABLE "DriverLocationHistory"
  ADD COLUMN "accuracyM" DOUBLE PRECISION,
  ADD COLUMN "sourceTimestamp" TIMESTAMP(3);

ALTER TABLE "DriverDocument"
  ADD COLUMN "byteSize" INTEGER,
  ADD COLUMN "checksum" TEXT,
  ADD COLUMN "submissionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "supersedesId" TEXT;

CREATE TABLE "DriverPayoutAccount" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'paystack',
  "providerRecipientCode" TEXT NOT NULL,
  "bankCode" TEXT NOT NULL,
  "accountLast4" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VERIFIED',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverPayoutAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverPayoutAccount_driverId_key" ON "DriverPayoutAccount"("driverId");
CREATE UNIQUE INDEX "DriverPayoutAccount_providerRecipientCode_key" ON "DriverPayoutAccount"("providerRecipientCode");
ALTER TABLE "DriverPayoutAccount" ADD CONSTRAINT "DriverPayoutAccount_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
