-- CreateTable
CREATE TABLE "public"."WidgetSettings" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#007bff',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0056b3',
    "buttonSize" TEXT NOT NULL DEFAULT '60px',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "buttonIcon" TEXT NOT NULL DEFAULT '💬',
    "windowWidth" TEXT NOT NULL DEFAULT '320px',
    "windowHeight" TEXT NOT NULL DEFAULT '420px',
    "headerText" TEXT NOT NULL DEFAULT 'Jarvis AI Chatbot',
    "placeholderText" TEXT NOT NULL DEFAULT 'Type your message...',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! How can I assist you today?',
    "showTypingIndicator" BOOLEAN NOT NULL DEFAULT true,
    "enableSounds" BOOLEAN NOT NULL DEFAULT false,
    "autoOpen" BOOLEAN NOT NULL DEFAULT false,
    "customCSS" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_shopDomain_key" ON "public"."WidgetSettings"("shopDomain");

-- CreateIndex
CREATE INDEX "WidgetSettings_shopDomain_idx" ON "public"."WidgetSettings"("shopDomain");
