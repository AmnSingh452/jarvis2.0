import { createHmac, timingSafeEqual } from "node:crypto";

console.log(`🔔 webhooks.app.uninstalled.jsx FIXED VERSION v3.0 loaded at ${new Date().toISOString()}`);

function verifyWebhookSignature(bodyBuffer, signature, secret) {
  if (!signature || !secret) {
    console.warn("⚠️ Missing webhook signature or secret");
    return false;
  }

  try {
    console.log(`🔐 HMAC Debug:`);
    console.log(`   Body length: ${bodyBuffer.length}`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Secret length: ${secret.length}`);

    const calculatedSignature = createHmac("sha256", secret)
      .update(bodyBuffer)
      .digest("base64");

    console.log(`   Calculated: ${calculatedSignature}`);
    console.log(`   Match: ${calculatedSignature === signature}`);

    if (calculatedSignature === signature) return true;

    const providedSigBuffer = Buffer.from(signature, "base64");
    const calculatedSigBuffer = Buffer.from(calculatedSignature, "base64");

    if (providedSigBuffer.length !== calculatedSigBuffer.length) {
      console.error("❌ Signature length mismatch");
      return false;
    }

    return timingSafeEqual(providedSigBuffer, calculatedSigBuffer);
  } catch (err) {
    console.error("❌ Error verifying webhook signature:", err);
    return false;
  }
}

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const db = (await import("../db.server")).default;

  console.log(`\n🔔 ===== APP UNINSTALLED WEBHOOK ===== ${new Date().toISOString()}`);

  const headers = Object.fromEntries(request.headers.entries());
  const shopHeader = headers["x-shopify-shop-domain"];
  const topicHeader = headers["x-shopify-topic"];
  const webhookId = headers["x-shopify-webhook-id"];
  const hmacHeader = headers["x-shopify-hmac-sha256"];

  console.log(`🔔 WEBHOOK DETAILS:`);
  console.log(`   Shop: ${shopHeader}`);
  console.log(`   Topic: ${topicHeader}`);
  console.log(`   Webhook ID: ${webhookId}`);
  console.log(`   HMAC Present: ${hmacHeader ? "Yes" : "No"}`);

  let rawBody;
  try {
    rawBody = new Uint8Array(await request.arrayBuffer());
  } catch {
    rawBody = new Uint8Array();
  }
  console.log(`🔔 WEBHOOK RAW BODY LENGTH: ${rawBody.length}`);
  console.log(`🔔 WEBHOOK BODY: ${Buffer.from(rawBody).toString("utf8")}`);

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  let hmacValid = false;

  // ✅ Skip HMAC for empty uninstall webhooks
  if (topicHeader === "app/uninstalled" && rawBody.length === 0) {
    console.warn("⚠️ Skipping HMAC verification for empty uninstall webhook body");
    hmacValid = true;
  } else if (hmacHeader) {
    // Try webhook secret first
    if (webhookSecret) {
      hmacValid = verifyWebhookSignature(rawBody, hmacHeader, webhookSecret);
    }
    // Fallback to client secret
    if (!hmacValid && clientSecret) {
      hmacValid = verifyWebhookSignature(rawBody, hmacHeader, clientSecret);
    }
    if (!hmacValid) {
      console.error("❌ HMAC signature verification failed");
      return new Response("Webhook signature verification failed", { status: 401 });
    }
  } else {
    console.warn("⚠️ Missing HMAC header — skipping verification");
  }

  try {
    const { shop, topic } = await authenticate.webhook(request);
    return await processUninstall(shop, db);
  } catch (authError) {
    console.error(`❌ Shopify authentication failed: ${authError.message}`);
    if (hmacValid && shopHeader && topicHeader === "app/uninstalled") {
      console.log(`🔄 Using HMAC-verified fallback for shop: ${shopHeader}`);
      return await processUninstall(shopHeader, db);
    }
    return new Response("Webhook Authentication Failed", { status: 401 });
  }
};

async function processUninstall(shop, db) {
  console.log(`🧹 Starting uninstall cleanup for ${shop}`);
  try {
    // Use transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      // 1. Delete all sessions
      const deletedSessions = await tx.session.deleteMany({ 
        where: { shop } 
      });

      // 2. Update and nullify access tokens - THIS IS THE KEY FIX
      const updatedShop = await tx.shop.updateMany({
        where: { shopDomain: shop },
        data: { 
          isActive: false, 
          uninstalledAt: new Date(), 
          accessToken: null, // Critical: Clear the access token
          tokenVersion: { increment: 1 }, // Invalidate any cached tokens
          updatedAt: new Date()
        },
      });

      // 3. Also clean up potential shop name variations
      const cleanupVariations = await tx.shop.updateMany({
        where: {
          OR: [
            { shopDomain: { contains: shop.replace('.myshopify.com', '') } },
            { shopDomain: shop }
          ]
        },
        data: { 
          isActive: false, 
          accessToken: null,
          uninstalledAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 4. Clean up related data
      await tx.widgetSettings.deleteMany({ where: { shopDomain: shop } });
      await tx.subscription.deleteMany({ where: { shopDomain: shop } });
      await tx.installationLog.deleteMany({ where: { shopDomain: shop } });

      return {
        deletedSessions: deletedSessions.count,
        updatedShop: updatedShop.count,
        cleanupVariations: cleanupVariations.count
      };
    });

    console.log(`✅ Uninstall cleanup completed for ${shop}:`);
    console.log(`   - Deleted sessions: ${result.deletedSessions}`);
    console.log(`   - Updated shop records: ${result.updatedShop}`);
    console.log(`   - Cleanup variations: ${result.cleanupVariations}`);
    
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(`❌ Uninstall cleanup failed for ${shop}:`, err);
    
    // CRITICAL FIX: Return 200 even on error to prevent Shopify retries
    // Log the error but don't make Shopify think the webhook failed
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      shop: shop,
      timestamp: new Date().toISOString()
    }), { 
      status: 200, // Changed from 500 to 200
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Add GET handler for testing
export const loader = async ({ request }) => {
  console.log(`🔔 GET request to app uninstalled webhook at ${new Date().toISOString()}`);
  
  return new Response(JSON.stringify({
    message: "App uninstallation webhook endpoint",
    status: "active",
    version: "v3.1",
    timestamp: new Date().toISOString(),
    features: [
      "HMAC verification",
      "Transaction-based cleanup",
      "Token nullification",
      "200 status on errors (prevents retries)"
    ]
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
