-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "whatsappApiKey" TEXT,
ADD COLUMN     "whatsappApiUrl" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappInstanceId" TEXT;
