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

<<<<<<< HEAD
  // Convert raw body to string for logging
  const bodyText = Buffer.from(rawBody).toString('utf8');
  console.log(`🔔 WEBHOOK BODY:`, bodyText);

  let hmacValid = false;
  if (rawBody.length === 0) {
  console.warn("⚠️ Skipping HMAC verification for empty body (Shopify uninstall webhook quirk)");
  // Proceed with uninstall logic below, do not return 401
  
  let hmacValid = true; // You can set hmacValid = true or skip the HMAC block
  }

  // Verify HMAC signature if available
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  
  
  console.log(`🔐 Secret Debug:`);
  console.log(`   SHOPIFY_WEBHOOK_SECRET: ${webhookSecret ? 'SET' : 'NOT SET'}`);
  console.log(`   SHOPIFY_API_SECRET: ${clientSecret ? 'SET' : 'NOT SET'}`);
  
  
=======
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  let hmacValid = false;
>>>>>>> 430050b (jarvis2: fixed uninstall webhook)

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
    await db.session.deleteMany({ where: { shop } });
    await db.shop.updateMany({
      where: { shopDomain: shop },
      data: { isActive: false, uninstalledAt: new Date(), accessToken: null },
    });
    await db.widgetSettings.deleteMany({ where: { shopDomain: shop } });
    await db.subscription.deleteMany({ where: { shopDomain: shop } });
    await db.installationLog.deleteMany({ where: { shopDomain: shop } });

    console.log(`✅ Cleanup complete for ${shop}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(`❌ Uninstall cleanup failed for ${shop}:`, err);
    return new Response("Cleanup Failed", { status: 500 });
  }
}
