-- AlterTable
ALTER TABLE "public"."WidgetSettings" ADD COLUMN     "cartAbandonmentDelay" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "cartAbandonmentDiscount" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "cartAbandonmentEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cartAbandonmentMessage" TEXT NOT NULL DEFAULT 'Don''t miss out! Complete your purchase and save {discount}% with code {code}';
