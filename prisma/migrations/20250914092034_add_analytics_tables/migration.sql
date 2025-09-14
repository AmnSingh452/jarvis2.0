-- CreateTable
CREATE TABLE "public"."ChatConversation" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerIp" TEXT,
    "customerName" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "customerSatisfaction" DOUBLE PRECISION,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionValue" DECIMAL(65,30),
    "topic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" DOUBLE PRECISION,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsMetrics" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" DOUBLE PRECISION,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customerSatisfaction" DOUBLE PRECISION,
    "topQuestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_shopDomain_startTime_idx" ON "public"."ChatConversation"("shopDomain", "startTime");

-- CreateIndex
CREATE INDEX "ChatConversation_shopDomain_converted_idx" ON "public"."ChatConversation"("shopDomain", "converted");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_timestamp_idx" ON "public"."ChatMessage"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsMetrics_shopDomain_date_idx" ON "public"."AnalyticsMetrics"("shopDomain", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsMetrics_shopDomain_date_key" ON "public"."AnalyticsMetrics"("shopDomain", "date");

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
