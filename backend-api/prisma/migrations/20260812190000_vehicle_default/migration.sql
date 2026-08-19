ALTER TABLE "Vehicle" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "customerId" ORDER BY "createdAt" ASC, "id" ASC) AS position
  FROM "Vehicle"
)
UPDATE "Vehicle"
SET "isDefault" = true
FROM ranked
WHERE "Vehicle"."id" = ranked."id" AND ranked.position = 1;

CREATE UNIQUE INDEX "Vehicle_one_default_per_customer"
  ON "Vehicle" ("customerId")
  WHERE "isDefault" = true;
