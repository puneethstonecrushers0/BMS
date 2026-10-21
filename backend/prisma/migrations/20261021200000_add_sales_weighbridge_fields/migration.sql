-- AlterTable
ALTER TABLE "sales" 
ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
ADD COLUMN IF NOT EXISTS "vehicleType" TEXT,
ADD COLUMN IF NOT EXISTS "grossDateTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "tareDateTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "creditDebit" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_serialNumber_idx" ON "sales"("serialNumber");
