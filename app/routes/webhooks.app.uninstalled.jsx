import { createHmac, timingSafeEqual } from "node:crypto";

console.log(`🔔 webhooks.app.uninstalled.jsx ROBUST VERSION v3.3 - Dual HMAC verification (base64+hex) loaded at ${new Date().toISOString()}`);

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

    // Try base64 first (most common for webhooks)
    const calculatedSignatureBase64 = createHmac("sha256", secret)
      .update(bodyBuffer)
      .digest("base64");

    console.log(`   Calculated (base64): ${calculatedSignatureBase64}`);
    console.log(`   Base64 Match: ${calculatedSignatureBase64 === signature}`);

    if (calculatedSignatureBase64 === signature) return true;

    // Try hex format as fallback
    const calculatedSignatureHex = createHmac("sha256", secret)
      .update(bodyBuffer)
      .digest("hex");

    console.log(`   Calculated (hex): ${calculatedSignatureHex}`);
    console.log(`   Hex Match: ${calculatedSignatureHex === signature}`);

    if (calculatedSignatureHex === signature) return true;

    // Use timing-safe comparison for base64
    try {
      const providedSigBuffer = Buffer.from(signature, "base64");
      const calculatedSigBuffer = Buffer.from(calculatedSignatureBase64, "base64");

      if (providedSigBuffer.length === calculatedSigBuffer.length) {
        return timingSafeEqual(providedSigBuffer, calculatedSigBuffer);
      }
    } catch (base64Error) {
      console.log(`   Base64 timing-safe comparison failed: ${base64Error.message}`);
    }

    // Use timing-safe comparison for hex
    try {
      const providedSigBuffer = Buffer.from(signature, "hex");
      const calculatedSigBuffer = Buffer.from(calculatedSignatureHex, "hex");

      if (providedSigBuffer.length === calculatedSigBuffer.length) {
        return timingSafeEqual(providedSigBuffer, calculatedSigBuffer);
      }
    } catch (hexError) {
      console.log(`   Hex timing-safe comparison failed: ${hexError.message}`);
    }

    return false;
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
    // Add timeout to prevent webhook hangs (Shopify has 5 second timeout)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Webhook timeout after 4 seconds')), 4000);
    });

    const authResult = await Promise.race([
      authenticate.webhook(request),
      timeoutPromise
    ]);
    
    const { shop, topic } = authResult;
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
    // Step 1: Delete sessions (most critical)
    console.log(`🧹 Step 1: Deleting sessions for ${shop}`);
    const deletedSessions = await db.session.deleteMany({ 
      where: { shop } 
    });
    console.log(`✅ Deleted ${deletedSessions.count} sessions`);

    // Step 2: Update shop records (nullify tokens)
    console.log(`🧹 Step 2: Updating shop records for ${shop}`);
    const updatedShop = await db.shop.updateMany({
      where: { shopDomain: shop },
      data: { 
        isActive: false, 
        uninstalledAt: new Date(), 
        accessToken: null, // Critical: Clear the access token
        tokenVersion: { increment: 1 } // Invalidate any cached tokens
      },
    });
    console.log(`✅ Updated ${updatedShop.count} shop records`);

    // Step 3: Clean up related data (non-critical, continue on error)
    try {
      console.log(`🧹 Step 3: Cleaning up related data for ${shop}`);
      await db.widgetSettings.deleteMany({ where: { shopDomain: shop } });
      await db.subscription.deleteMany({ where: { shopDomain: shop } });
      await db.installationLog.deleteMany({ where: { shopDomain: shop } });
      console.log(`✅ Cleaned up related data`);
    } catch (cleanupErr) {
      console.warn(`⚠️ Related data cleanup failed (non-critical):`, cleanupErr.message);
    }

    console.log(`✅ Uninstall cleanup completed for ${shop}`);
    return new Response("OK", { status: 200 });
    
  } catch (err) {
    console.error(`❌ Uninstall cleanup failed for ${shop}:`, err);
    console.error(`❌ Error details:`, {
      message: err.message,
      code: err.code,
      stack: err.stack?.substring(0, 500)
    });
    
    // CRITICAL FIX: Return 200 even on error to prevent Shopify retries
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
    version: "v3.3",
    timestamp: new Date().toISOString(),
    features: [
      "Dual HMAC verification (base64+hex)",
      "Step-by-step cleanup (no transaction)",
      "Token nullification",
      "Timeout protection (4s)",
      "200 status on errors (prevents retries)"
    ]
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
