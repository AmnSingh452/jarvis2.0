import { createHmac, timingSafeEqual } from "node:crypto";

// Add immediate logging to see if this file is even being loaded
console.log(`🔔 webhooks.app.uninstalled.jsx file loaded at ${new Date().toISOString()}`);

// HMAC Verification Function
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) {
    console.warn("⚠️ Missing webhook signature or secret");
    return false;
  }

  try {
    console.log(`🔐 HMAC Debug:`);
    console.log(`   Body length: ${body.length}`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Secret length: ${secret.length}`);
    
    // Shopify sends HMAC as base64, calculate our own
    const hmac = createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    
    console.log(`   Calculated: ${calculatedSignature}`);
    console.log(`   Match: ${calculatedSignature === signature}`);
    
    // Direct string comparison first
    if (calculatedSignature === signature) {
      return true;
    }
    
    // Fallback to buffer comparison for timing safety
    const providedSignature = Buffer.from(signature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    
    if (providedSignature.length !== calculatedBuffer.length) {
      console.error("❌ Signature length mismatch");
      return false;
    }
    
    const isValid = timingSafeEqual(providedSignature, calculatedBuffer);
    console.log(`🔐 Buffer comparison result: ${isValid}`);
    return isValid;
    
  } catch (error) {
    console.error("❌ Error verifying webhook signature:", error);
    return false;
  }
}

export const action = async ({ request }) => {
  // Import server-only modules inside the action function
  const { authenticate } = await import("../shopify.server");
  const db = (await import("../db.server")).default;
  const { TokenCleanupService } = await import("../../enhanced-token-cleanup.js");
  
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 ===== APP UNINSTALLED WEBHOOK ===== ${timestamp}`);
  console.log(`🔔 Webhook received: ${request.method} ${request.url}`);
  
  // Clone the request to avoid "body used already" error
  const clonedRequest = request.clone();
  
  // Log all headers for debugging
  const headers = Object.fromEntries(request.headers.entries());
  console.log(`🔔 ALL HEADERS:`, JSON.stringify(headers, null, 2));
  
  // Extract webhook information
  const shopHeader = headers['x-shopify-shop-domain'];
  const topicHeader = headers['x-shopify-topic'];
  const webhookId = headers['x-shopify-webhook-id'];
  const hmacHeader = headers['x-shopify-hmac-sha256'];
  
  console.log(`🔔 WEBHOOK DETAILS:`);
  console.log(`   Shop: ${shopHeader}`);
  console.log(`   Topic: ${topicHeader}`);
  console.log(`   Webhook ID: ${webhookId}`);
  console.log(`   HMAC Present: ${hmacHeader ? 'Yes' : 'No'}`);

  // Get request body for HMAC verification
  let bodyText = '';
  try {
    bodyText = await clonedRequest.text();
    console.log(`🔔 WEBHOOK BODY:`, bodyText);
  } catch (e) {
    console.log(`🔔 Could not read webhook body:`, e.message);
  }

  // Verify HMAC signature if available
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  let hmacValid = false;
  
  console.log(`🔐 Secret Debug:`);
  console.log(`   SHOPIFY_WEBHOOK_SECRET: ${webhookSecret ? 'SET' : 'NOT SET'}`);
  console.log(`   SHOPIFY_API_SECRET: ${clientSecret ? 'SET' : 'NOT SET'}`);
  
  if (hmacHeader) {
    // Try webhook secret first
    if (webhookSecret) {
      hmacValid = verifyWebhookSignature(bodyText, hmacHeader, webhookSecret);
      if (hmacValid) {
        console.log(`✅ HMAC signature verified with webhook secret`);
      } else {
        console.log(`❌ HMAC verification failed with webhook secret`);
        
        // Try with client secret as fallback
        if (clientSecret) {
          console.log(`🔄 Trying with client secret...`);
          hmacValid = verifyWebhookSignature(bodyText, hmacHeader, clientSecret);
          if (hmacValid) {
            console.log(`✅ HMAC signature verified with client secret`);
          } else {
            console.log(`❌ HMAC verification failed with client secret too`);
          }
        }
      }
    } else if (clientSecret) {
      // Only client secret available
      hmacValid = verifyWebhookSignature(bodyText, hmacHeader, clientSecret);
      if (hmacValid) {
        console.log(`✅ HMAC signature verified with client secret`);
      } else {
        console.log(`❌ HMAC verification failed with client secret`);
      }
    }
    if (!hmacValid) {
      console.error(`❌ HMAC signature verification failed`);
      return new Response("Webhook signature verification failed", { status: 401 });
    }
    console.log(`✅ HMAC signature verified successfully`);
  } else {
    console.warn(`⚠️ HMAC verification skipped - missing signature or secret`);
  }

  // Try Shopify's built-in authentication first
  try {
    const { shop, session, topic } = await authenticate.webhook(request);
    console.log(`✅ Shopify authentication successful for shop: ${shop}, topic: ${topic}`);
    return await processUninstall(shop);

  } catch (authError) {
    console.error(`❌ Shopify authentication failed:`, authError.message);
    
    // If HMAC is valid and we have shop info, proceed with cleanup
    if (hmacValid && shopHeader && topicHeader === 'app/uninstalled') {
      console.log(`🔄 Using HMAC-verified fallback for shop: ${shopHeader}`);
      return await processUninstall(shopHeader);
    }
    
    // If we have shop info but no HMAC (dev environment), allow fallback
    if (shopHeader && topicHeader === 'app/uninstalled' && !hmacHeader) {
      console.log(`🔄 Development fallback for shop: ${shopHeader} (no HMAC required)`);
      return await processUninstall(shopHeader);
    }
    
    console.error(`❌ Authentication failed and no valid fallback available`);
    return new Response("Webhook Authentication Failed", { status: 401 });
  }
};

async function processUninstall(shop) {
  console.log(`\n🧹 ===== STARTING UNINSTALL PROCESS FOR ${shop} =====`);
  
  try {
    console.log(`🧹 Processing enhanced uninstallation cleanup for shop: ${shop}`);
    
    // Use enhanced cleanup service
    const cleanupService = new TokenCleanupService();
    const result = await cleanupService.cleanupOnUninstall(shop);
    
    console.log(`✅ Enhanced cleanup completed for ${shop}:`, result);
    console.log(`✅ ===== UNINSTALL PROCESS COMPLETED SUCCESSFULLY =====\n`);
    
    return new Response("OK", { status: 200 });
    
  } catch (cleanupError) {
    console.error(`❌ Error processing uninstallation for ${shop}:`, cleanupError);
    console.error(`❌ Error stack:`, cleanupError.stack);
    
    // Fallback to basic cleanup if enhanced fails
    try {
      console.log(`🔄 Attempting fallback cleanup for ${shop}`);
      
      // Basic cleanup with more detailed logging
      console.log(`🔄 Step 1: Deleting sessions for ${shop}`);
      const deletedSessions = await db.session.deleteMany({ 
        where: { shop } 
      });
      console.log(`✅ Deleted ${deletedSessions.count} sessions`);
      
      console.log(`🔄 Step 2: Updating shop record for ${shop}`);
      const updatedShop = await db.shop.updateMany({
        where: { shopDomain: shop },
        data: { 
          isActive: false,
          uninstalledAt: new Date(),
          accessToken: null,
          tokenVersion: { increment: 1 }
        }
      });
      console.log(`✅ Updated ${updatedShop.count} shop records`);
      
      console.log(`✅ Fallback cleanup completed - Sessions: ${deletedSessions.count}, Shops: ${updatedShop.count}`);
      console.log(`✅ ===== FALLBACK UNINSTALL PROCESS COMPLETED =====\n`);
      
      return new Response("OK - Fallback", { status: 200 });
      
    } catch (fallbackError) {
      console.error(`❌ Fallback cleanup also failed for ${shop}:`, fallbackError);
      console.error(`❌ Fallback error stack:`, fallbackError.stack);
      console.error(`❌ ===== UNINSTALL PROCESS FAILED COMPLETELY =====\n`);
      return new Response("Cleanup Failed", { status: 500 });
    }
  }
}
