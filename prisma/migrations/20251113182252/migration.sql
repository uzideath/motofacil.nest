-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('IN_CIRCULATION', 'IN_WORKSHOP', 'SEIZED_BY_PROSECUTOR');

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN     "advancePaymentDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Owners" ADD COLUMN     "permissions" JSONB;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "status" "VehicleStatus" NOT NULL DEFAULT 'IN_CIRCULATION';
