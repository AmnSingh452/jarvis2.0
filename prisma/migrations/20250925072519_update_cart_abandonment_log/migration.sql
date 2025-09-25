/*
  Warnings:

  - Made the column `customerId` on table `CartAbandonmentLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."CartAbandonmentLog_sessionId_shopDomain_idx";

-- AlterTable
ALTER TABLE "public"."CartAbandonmentLog" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "sessionId" DROP NOT NULL,
ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "discountCode" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "CartAbandonmentLog_customerId_shopDomain_createdAt_idx" ON "public"."CartAbandonmentLog"("customerId", "shopDomain", "createdAt");
