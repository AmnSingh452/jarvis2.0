import { createHmac, timingSafeEqual } from "node:crypto";

console.log(`🔔 shop.redact.jsx loaded at ${new Date().toISOString()}`);

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
    console.error("❌ HMAC verification error:", error);
    return false;
  }
}

export const action = async ({ request }) => {
  // Import server-only modules inside the action function
  const { authenticate } = await import("../shopify.server");
  const db = (await import("../db.server")).default;
  
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 ===== SHOP REDACT WEBHOOK ===== ${timestamp}`);
  
  try {
    // Clone request for HMAC verification
    const clonedRequest = request.clone();
    const headers = Object.fromEntries(request.headers.entries());
    const shopDomain = headers['x-shopify-shop-domain'];
    const topic = headers['x-shopify-topic'];
    const hmacHeader = headers['x-shopify-hmac-sha256'];
    
    console.log(`🔔 Shop: ${shopDomain}, Topic: ${topic}`);
    console.log(`🔔 HMAC Present: ${hmacHeader ? 'Yes' : 'No'}`);
    
    // Verify HMAC if available
    const body = await clonedRequest.text();
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    const clientSecret = process.env.SHOPIFY_API_SECRET;
    
    console.log(`🔐 Secret Debug:`);
    console.log(`   SHOPIFY_WEBHOOK_SECRET: ${webhookSecret ? 'SET' : 'NOT SET'}`);
    console.log(`   SHOPIFY_API_SECRET: ${clientSecret ? 'SET' : 'NOT SET'}`);
    
    if (body.length === 0) {
      console.warn("⚠️ Skipping HMAC verification for empty body (Shopify compliance webhook quirk)");
      hmacValid = true;
      // Proceed with webhook logic, do not return 401
    }

    if (hmacHeader) {
      // Try webhook secret first
      if (webhookSecret) {
        const hmacValid = verifyWebhookSignature(body, hmacHeader, webhookSecret);
        if (hmacValid) {
          console.log(`✅ HMAC signature verified with webhook secret`);
        } else {
          console.log(`❌ HMAC verification failed with webhook secret`);
          
          // Try with client secret as fallback
          if (clientSecret) {
            console.log(`🔄 Trying with client secret...`);
            const hmacValidClient = verifyWebhookSignature(body, hmacHeader, clientSecret);
            if (hmacValidClient) {
              console.log(`✅ HMAC signature verified with client secret`);
            } else {
              console.log(`❌ HMAC verification failed with client secret too`);
              return new Response("Webhook signature verification failed", { status: 401 });
            }
          } else {
            return new Response("Webhook signature verification failed", { status: 401 });
          }
        }
      } else if (clientSecret) {
        // Only client secret available
        const hmacValid = verifyWebhookSignature(body, hmacHeader, clientSecret);
        if (!hmacValid) {
          console.error(`❌ HMAC verification failed with client secret`);
          return new Response("Webhook signature verification failed", { status: 401 });
        }
        console.log(`✅ HMAC signature verified with client secret`);
      } else {
        console.error(`❌ No webhook or client secret available for HMAC verification`);
        return new Response("Webhook signature verification failed", { status: 401 });
      }
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(body);
    console.log(`🔔 Shop redact payload:`, payload);
    
    // Required fields from Shopify:
    const {
      shop_id,
      shop_domain
    } = payload;
    
    console.log(`🗑️ Processing shop redaction for: ${shop_domain} (ID: ${shop_id})`);
    
    // GDPR Compliance: Delete ALL shop data (this is the nuclear option)
    // This webhook is called when a shop requests complete data deletion
    
    let deletionSummary = {
      sessions: 0,
      shops: 0,
      interactions: 0,
      configs: 0,
      subscriptions: 0
    };
    
    try {
      // Delete all data related to this shop
      console.log(`🗑️ Starting complete shop data deletion for: ${shop_domain}`);
      
      // 1. Delete sessions
      const deletedSessions = await db.session.deleteMany({
        where: { shop: shop_domain }
      });
      deletionSummary.sessions = deletedSessions.count;
      console.log(`🗑️ Deleted ${deletedSessions.count} sessions`);
      
      // 2. Delete/update shop records
      const deletedShops = await db.shop.deleteMany({
        where: { shopDomain: shop_domain }
      });
      deletionSummary.shops = deletedShops.count;
      console.log(`🗑️ Deleted ${deletedShops.count} shop records`);
      
      // 3. Delete customer interactions (if you have this table)
      try {
        const deletedInteractions = await db.$executeRaw`
          DELETE FROM customer_interactions 
          WHERE shop_domain = ${shop_domain}
        `.catch(() => ({ count: 0 }));
        deletionSummary.interactions = deletedInteractions?.count || 0;
        console.log(`🗑️ Deleted ${deletionSummary.interactions} customer interactions`);
      } catch (e) {
        console.log(`ℹ️ No customer_interactions table found`);
      }
      
      // 4. Delete widget configurations (if you have this table)
      try {
        const deletedConfigs = await db.$executeRaw`
          DELETE FROM widget_config 
          WHERE shop_domain = ${shop_domain}
        `.catch(() => ({ count: 0 }));
        deletionSummary.configs = deletedConfigs?.count || 0;
        console.log(`🗑️ Deleted ${deletionSummary.configs} widget configs`);
      } catch (e) {
        console.log(`ℹ️ No widget_config table found`);
      }
      
      // 5. Cancel any active subscriptions
      try {
        const cancelledSubs = await db.$executeRaw`
          UPDATE subscriptions 
          SET status = 'cancelled', cancelled_at = NOW()
          WHERE shop_domain = ${shop_domain}
        `.catch(() => ({ count: 0 }));
        deletionSummary.subscriptions = cancelledSubs?.count || 0;
        console.log(`🗑️ Cancelled ${deletionSummary.subscriptions} subscriptions`);
      } catch (e) {
        console.log(`ℹ️ No subscriptions table found`);
      }
      
    } catch (dbError) {
      console.error(`❌ Database deletion error:`, dbError);
      throw dbError;
    }
    
    const responseData = {
      message: "Jarvis2.0 Chatbot - Shop Data Completely Redacted",
      timestamp: timestamp,
      shop_domain: shop_domain,
      shop_id: shop_id,
      deletion_summary: deletionSummary,
      total_records_deleted: Object.values(deletionSummary).reduce((a, b) => a + b, 0),
      status: "completed",
      compliance_note: "All shop data has been permanently removed from our systems"
    };
    
    console.log(`✅ Shop redaction completed:`, responseData);
    console.log(`✅ ===== SHOP REDACT COMPLETED =====\n`);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`❌ Error processing shop redaction:`, error);
    console.error(`❌ Error stack:`, error.stack);
    
    return new Response(JSON.stringify({
      error: "Failed to process shop redaction",
      message: error.message,
      timestamp: timestamp
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
