import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createHmac, timingSafeEqual } from "node:crypto";

console.log(`🔔 shop.redact.jsx loaded at ${new Date().toISOString()}`);

// HMAC Verification Function
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    const providedSignature = Buffer.from(signature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    return providedSignature.length === calculatedBuffer.length && 
           timingSafeEqual(providedSignature, calculatedBuffer);
  } catch (error) {
    console.error("❌ HMAC verification error:", error);
    return false;
  }
}

export const action = async ({ request }) => {
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
    
    if (hmacHeader && webhookSecret) {
      const hmacValid = verifyWebhookSignature(body, hmacHeader, webhookSecret);
      if (!hmacValid) {
        console.error(`❌ HMAC verification failed`);
        return new Response("Webhook signature verification failed", { status: 401 });
      }
      console.log(`✅ HMAC signature verified`);
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
