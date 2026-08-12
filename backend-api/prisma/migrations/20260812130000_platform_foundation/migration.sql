-- Enum extensions
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'wallet';
ALTER TYPE "DriverVerificationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- New enums
CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT', 'DEBIT', 'PROMO_CREDIT', 'REFUND', 'PAYMENT', 'PAYOUT', 'ADJUSTMENT');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'RECONCILED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE');
CREATE TYPE "DocumentKind" AS ENUM ('SA_ID', 'DRIVERS_LICENCE', 'PROOF_OF_ADDRESS', 'VEHICLE_REGISTRATION', 'INSURANCE', 'TRAINING_CERT', 'OTHER');
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'REJECTED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');
CREATE TYPE "ConsentPurpose" AS ENUM ('TERMS', 'POPIA_PROCESSING', 'MARKETING', 'LOCATION', 'EVIDENCE_PHOTOS');

-- Convert money floats to integer cents
ALTER TABLE "CustomerProfile" ALTER COLUMN "walletBalance" TYPE INTEGER USING ROUND("walletBalance" * 100)::INTEGER;
ALTER TABLE "ServiceOption" ALTER COLUMN "basePrice" TYPE INTEGER USING ROUND("basePrice" * 100)::INTEGER;
ALTER TABLE "Booking" ALTER COLUMN "price" TYPE INTEGER USING ROUND("price" * 100)::INTEGER;
ALTER TABLE "Booking" ALTER COLUMN "basePrice" TYPE INTEGER USING ROUND("basePrice" * 100)::INTEGER;
ALTER TABLE "Booking" ALTER COLUMN "discountAmount" TYPE INTEGER USING ROUND("discountAmount" * 100)::INTEGER;
ALTER TABLE "Payment" ALTER COLUMN "amountZar" TYPE INTEGER USING ROUND("amountZar" * 100)::INTEGER;
ALTER TABLE "Promotion" ALTER COLUMN "discountValue" TYPE INTEGER USING
  CASE WHEN "discountType" = 'PERCENT' THEN ROUND("discountValue")::INTEGER
  ELSE ROUND("discountValue" * 100)::INTEGER END;

-- Existing table columns
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT,
  ADD COLUMN IF NOT EXISTS "lastLoginUserAgent" TEXT;

ALTER TABLE "CustomerProfile"
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "loyaltyTier" TEXT NOT NULL DEFAULT 'BRONZE',
  ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "popiaConsentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_referralCode_key" ON "CustomerProfile"("referralCode");
CREATE INDEX IF NOT EXISTS "CustomerProfile_status_idx" ON "CustomerProfile"("status");
CREATE INDEX IF NOT EXISTS "CustomerProfile_phone_idx" ON "CustomerProfile"("phone");

ALTER TABLE "DriverProfile"
  ADD COLUMN IF NOT EXISTS "verificationNote" TEXT,
  ADD COLUMN IF NOT EXISTS "online" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shiftStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shiftEndedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acceptTimeoutSec" INTEGER NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS "DriverProfile_status_idx" ON "DriverProfile"("status");
CREATE INDEX IF NOT EXISTS "DriverProfile_verificationStatus_idx" ON "DriverProfile"("verificationStatus");
CREATE INDEX IF NOT EXISTS "DriverProfile_online_idx" ON "DriverProfile"("online");

ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "colour" TEXT;

ALTER TABLE "ServiceOption"
  ADD COLUMN IF NOT EXISTS "vehicleSize" TEXT NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "interior" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "exterior" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleId" TEXT,
  ADD COLUMN IF NOT EXISTS "washPackageId" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceAreaId" TEXT,
  ADD COLUMN IF NOT EXISTS "fleetAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "surchargeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancellationFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "waterLitresUsed" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS "waterLitresSaved" DOUBLE PRECISION NOT NULL DEFAULT 148.5,
  ADD COLUMN IF NOT EXISTS "routeDistanceKm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "routeEtaMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "acceptBy" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "vehicleSize" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "addOnSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "conditionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "accessInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rescheduledFromId" TEXT;

UPDATE "Booking" SET "reference" = 'DPL-' || UPPER(SUBSTRING(REPLACE("id", '_', '') FROM 1 FOR 8))
WHERE "reference" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "reference" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_reference_key" ON "Booking"("reference");
CREATE INDEX IF NOT EXISTS "Booking_reference_idx" ON "Booking"("reference");
CREATE INDEX IF NOT EXISTS "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Booking_createdAt_idx" ON "Booking"("createdAt");
CREATE INDEX IF NOT EXISTS "Booking_fleetAccountId_idx" ON "Booking"("fleetAccountId");

ALTER TABLE "BookingEvidence"
  ADD COLUMN IF NOT EXISTS "storageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "byteSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "offlineQueued" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "maxRedemptions" INTEGER;

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "deviceLabel" TEXT;

ALTER TABLE "DriverLocation"
  ADD COLUMN IF NOT EXISTS "accuracyM" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "spoofSuspect" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "Incident_assigneeId_idx" ON "Incident"("assigneeId");

-- New tables
CREATE TABLE "MfaChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaChallenge_tokenHash_key" ON "MfaChallenge"("tokenHash");
CREATE INDEX "MfaChallenge_userId_idx" ON "MfaChallenge"("userId");

CREATE TABLE "LoginEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");
CREATE INDEX "LoginEvent_ip_idx" ON "LoginEvent"("ip");

CREATE TABLE "SavedAddress" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "suburb" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "accessNotes" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedAddress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedAddress_customerId_idx" ON "SavedAddress"("customerId");

CREATE TABLE "ServiceAddOn" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 10,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ServiceAddOn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceAddOn_serviceId_slug_key" ON "ServiceAddOn"("serviceId", "slug");

CREATE TABLE "WashPackage" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "sedanCents" INTEGER NOT NULL,
  "suvCents" INTEGER NOT NULL,
  "bakkieCents" INTEGER NOT NULL,
  "truckCents" INTEGER NOT NULL,
  "waterLitresEstimate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  "traditionalLitres" DOUBLE PRECISION NOT NULL DEFAULT 150,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WashPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WashPackage_serviceId_slug_key" ON "WashPackage"("serviceId", "slug");

CREATE TABLE "PricingRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ruleType" TEXT NOT NULL,
  "vehicleSize" TEXT,
  "condition" TEXT,
  "amountCents" INTEGER NOT NULL,
  "percentBps" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceArea" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "polygonGeoJson" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "weatherHold" BOOLEAN NOT NULL DEFAULT false,
  "weatherReason" TEXT,
  "operatingFrom" TEXT NOT NULL DEFAULT '06:00',
  "operatingTo" TEXT NOT NULL DEFAULT '20:00',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceArea_slug_key" ON "ServiceArea"("slug");

CREATE TABLE "WashChecklist" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "exteriorDone" BOOLEAN NOT NULL DEFAULT false,
  "interiorDone" BOOLEAN NOT NULL DEFAULT false,
  "wheelsDone" BOOLEAN NOT NULL DEFAULT false,
  "glassDone" BOOLEAN NOT NULL DEFAULT false,
  "matsDone" BOOLEAN NOT NULL DEFAULT false,
  "finalInspected" BOOLEAN NOT NULL DEFAULT false,
  "rewashRequested" BOOLEAN NOT NULL DEFAULT false,
  "damageAck" BOOLEAN NOT NULL DEFAULT false,
  "customerSignedAt" TIMESTAMP(3),
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WashChecklist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WashChecklist_bookingId_key" ON "WashChecklist"("bookingId");

CREATE TABLE "WebhookReceipt" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "payloadHash" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebhookReceipt_provider_providerEventId_key" ON "WebhookReceipt"("provider", "providerEventId");
CREATE INDEX "WebhookReceipt_payloadHash_idx" ON "WebhookReceipt"("payloadHash");

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "bookingId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "cancellationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "externalRef" TEXT,
  "approvedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX "Refund_bookingId_idx" ON "Refund"("bookingId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

CREATE TABLE "Chargeback" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "evidenceNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Chargeback_paymentId_idx" ON "Chargeback"("paymentId");

CREATE TABLE "WalletLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletEntryType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "reference" TEXT,
  "bookingId" TEXT,
  "paymentId" TEXT,
  "promoCode" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletLedgerEntry_userId_createdAt_idx" ON "WalletLedgerEntry"("userId", "createdAt");
CREATE INDEX "WalletLedgerEntry_reference_idx" ON "WalletLedgerEntry"("reference");

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "paymentId" TEXT,
  "fleetAccountId" TEXT,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "subtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "pdfUrl" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");
CREATE INDEX "Invoice_fleetAccountId_idx" ON "Invoice"("fleetAccountId");

CREATE TABLE "DriverEarning" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "bookingId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "netCents" INTEGER NOT NULL,
  "note" TEXT,
  "payoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverEarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverEarning_driverId_createdAt_idx" ON "DriverEarning"("driverId", "createdAt");
CREATE INDEX "DriverEarning_bookingId_idx" ON "DriverEarning"("bookingId");

CREATE TABLE "DriverPayout" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "externalRef" TEXT,
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverPayout_driverId_idx" ON "DriverPayout"("driverId");
CREATE INDEX "DriverPayout_status_idx" ON "DriverPayout"("status");

CREATE TABLE "DriverLocationHistory" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "heading" DOUBLE PRECISION,
  "speedKph" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverLocationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverLocationHistory_driverId_createdAt_idx" ON "DriverLocationHistory"("driverId", "createdAt");

CREATE TABLE "DriverDocument" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "kind" "DocumentKind" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverDocument_driverId_kind_idx" ON "DriverDocument"("driverId", "kind");
CREATE INDEX "DriverDocument_status_idx" ON "DriverDocument"("status");
CREATE INDEX "DriverDocument_expiresAt_idx" ON "DriverDocument"("expiresAt");

CREATE TABLE "DriverTraining" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "certificateKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverTraining_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverTraining_driverId_idx" ON "DriverTraining"("driverId");

CREATE TABLE "DriverEquipment" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serial" TEXT,
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedAt" TIMESTAMP(3),
  "faultNote" TEXT,
  CONSTRAINT "DriverEquipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverEquipment_driverId_idx" ON "DriverEquipment"("driverId");

CREATE TABLE "DriverConsumable" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "threshold" INTEGER NOT NULL DEFAULT 2,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverConsumable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverConsumable_driverId_sku_key" ON "DriverConsumable"("driverId", "sku");

CREATE TABLE "DriverAvailability" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "DriverAvailability_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverAvailability_driverId_idx" ON "DriverAvailability"("driverId");

CREATE TABLE "ConsumableUsage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumableUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsumableUsage_bookingId_idx" ON "ConsumableUsage"("bookingId");

CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "threshold" INTEGER NOT NULL DEFAULT 10,
  "unit" TEXT NOT NULL DEFAULT 'unit',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "channel" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

CREATE TABLE "Complaint" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "bookingId" TEXT,
  "category" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Complaint_customerId_idx" ON "Complaint"("customerId");
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

CREATE TABLE "Rating" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "driverId" TEXT,
  "stars" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Rating_bookingId_customerId_key" ON "Rating"("bookingId", "customerId");

CREATE TABLE "BookingMessage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BookingMessage_bookingId_createdAt_idx" ON "BookingMessage"("bookingId", "createdAt");

CREATE TABLE "PhoneOtp" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "userId" TEXT,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhoneOtp_phone_idx" ON "PhoneOtp"("phone");

CREATE TABLE "UserConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "ConsentPurpose" NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserConsent_userId_purpose_idx" ON "UserConsent"("userId", "purpose");

CREATE TABLE "DataRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "exportUrl" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DataRequest_userId_idx" ON "DataRequest"("userId");

CREATE TABLE "FleetAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "registrationNo" TEXT,
  "ownerCustomerId" TEXT NOT NULL,
  "billingEmail" TEXT NOT NULL,
  "contractPriceCents" INTEGER,
  "costCentre" TEXT,
  "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FleetAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetMember" (
  "id" TEXT NOT NULL,
  "fleetAccountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FleetMember_fleetAccountId_userId_key" ON "FleetMember"("fleetAccountId", "userId");

CREATE TABLE "FleetVehicle" (
  "id" TEXT NOT NULL,
  "fleetAccountId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "costCentre" TEXT,
  CONSTRAINT "FleetVehicle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FleetVehicle_vehicleId_key" ON "FleetVehicle"("vehicleId");

CREATE TABLE "RecurringSchedule" (
  "id" TEXT NOT NULL,
  "fleetAccountId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "time" TEXT NOT NULL,
  "optionSlug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyCents" INTEGER NOT NULL,
  "washesIncluded" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "washesUsed" INTEGER NOT NULL DEFAULT 0,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE TABLE "EcoPointsLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "bookingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EcoPointsLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EcoPointsLedger_userId_createdAt_idx" ON "EcoPointsLedger"("userId", "createdAt");

CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId" TEXT NOT NULL,
  "rewardCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

CREATE TABLE "OpsSavedView" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpsSavedView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Broadcast" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackgroundJob_queue_status_runAt_idx" ON "BackgroundJob"("queue", "status", "runAt");

CREATE TABLE "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "HighRiskApproval" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "HighRiskApproval_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedAddress" ADD CONSTRAINT "SavedAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceAddOn" ADD CONSTRAINT "ServiceAddOn_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WashPackage" ADD CONSTRAINT "WashPackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_washPackageId_fkey" FOREIGN KEY ("washPackageId") REFERENCES "WashPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WashChecklist" ADD CONSTRAINT "WashChecklist_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "DriverPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverPayout" ADD CONSTRAINT "DriverPayout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverLocationHistory" ADD CONSTRAINT "DriverLocationHistory_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverTraining" ADD CONSTRAINT "DriverTraining_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverEquipment" ADD CONSTRAINT "DriverEquipment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverConsumable" ADD CONSTRAINT "DriverConsumable_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverAvailability" ADD CONSTRAINT "DriverAvailability_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumableUsage" ADD CONSTRAINT "ConsumableUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetAccount" ADD CONSTRAINT "FleetAccount_ownerCustomerId_fkey" FOREIGN KEY ("ownerCustomerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FleetMember" ADD CONSTRAINT "FleetMember_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetMember" ADD CONSTRAINT "FleetMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FleetVehicle" ADD CONSTRAINT "FleetVehicle_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetVehicle" ADD CONSTRAINT "FleetVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcoPointsLedger" ADD CONSTRAINT "EcoPointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpsSavedView" ADD CONSTRAINT "OpsSavedView_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "OpsAdminProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Incident" SET "assigneeId" = NULL
WHERE "assigneeId" IS NOT NULL
  AND "assigneeId" NOT IN (SELECT "id" FROM "OpsAdminProfile");
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "OpsAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "PromotionRedemption_promotionId_userId_key" ON "PromotionRedemption"("promotionId", "userId");
