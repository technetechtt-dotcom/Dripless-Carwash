-- Persist driver→customer ratings and expose aggregate customer rating.
ALTER TABLE "CustomerProfile" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS "CustomerRating" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerRating_bookingId_driverId_key" ON "CustomerRating"("bookingId", "driverId");
CREATE INDEX IF NOT EXISTS "CustomerRating_customerId_idx" ON "CustomerRating"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerRating_driverId_idx" ON "CustomerRating"("driverId");

ALTER TABLE "CustomerRating"
  ADD CONSTRAINT "CustomerRating_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerRating"
  ADD CONSTRAINT "CustomerRating_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerRating"
  ADD CONSTRAINT "CustomerRating_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
