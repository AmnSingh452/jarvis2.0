-- CreateTable
CREATE TABLE "public"."CartAbandonmentLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "customerId" TEXT,
    "discountCode" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "cartTotal" DOUBLE PRECISION,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartAbandonmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartAbandonmentLog_sessionId_shopDomain_idx" ON "public"."CartAbandonmentLog"("sessionId", "shopDomain");

-- CreateIndex
CREATE INDEX "CartAbandonmentLog_shopDomain_createdAt_idx" ON "public"."CartAbandonmentLog"("shopDomain", "createdAt");
