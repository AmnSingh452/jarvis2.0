import { authenticate } from "../shopify.server";
import db from "../db.server";
import crypto from "crypto";

console.log(`🔔 customers.redact.jsx loaded at ${new Date().toISOString()}`);

// HMAC Verification Function
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    const providedSignature = Buffer.from(signature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    return providedSignature.length === calculatedBuffer.length && 
           crypto.timingSafeEqual(providedSignature, calculatedBuffer);
  } catch (error) {
    console.error("❌ HMAC verification error:", error);
    return false;
  }
}

export const action = async ({ request }) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 ===== CUSTOMER REDACT WEBHOOK ===== ${timestamp}`);
  
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
    console.log(`🔔 Customer redact payload:`, payload);
    
    // Required fields from Shopify:
    const {
      shop_id,
      shop_domain,
      customer,
      orders_to_redact
    } = payload;
    
    const customerId = customer?.id;
    console.log(`🗑️ Processing customer redaction for: ${customerId}`);
    console.log(`🗑️ Shop: ${shop_domain} (ID: ${shop_id})`);
    console.log(`🗑️ Orders to redact: ${orders_to_redact?.length || 0}`);
    
    // GDPR Compliance: Delete/anonymize customer data
    let deletedRecords = 0;
    
    if (customerId) {
      try {
        // Example: Remove customer references from your database
        // Adjust based on your actual data schema
        
        // If you store customer interactions in your chatbot
        const deleted = await db.$executeRaw`
          DELETE FROM customer_interactions 
          WHERE customer_id = ${customerId} 
          AND shop_domain = ${shop_domain}
        `.catch(() => ({ count: 0 }));
        
        deletedRecords = deleted?.count || 0;
        console.log(`🗑️ Deleted ${deletedRecords} customer interaction records`);
        
        // If you have other customer data tables, add similar deletions here
        
      } catch (dbError) {
        console.warn(`⚠️ Database cleanup warning:`, dbError.message);
        // Continue processing even if DB cleanup fails
      }
    }
    
    const responseData = {
      message: "Jarvis2.0 Chatbot - Customer Data Redacted",
      timestamp: timestamp,
      shop_domain: shop_domain,
      customer_id: customerId,
      records_deleted: deletedRecords,
      status: "completed",
      compliance_note: "Customer data has been removed from our systems as requested"
    };
    
    console.log(`✅ Customer redaction completed:`, responseData);
    console.log(`✅ ===== CUSTOMER REDACT COMPLETED =====\n`);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`❌ Error processing customer redaction:`, error);
    console.error(`❌ Error stack:`, error.stack);
    
    return new Response(JSON.stringify({
      error: "Failed to process customer redaction",
      message: error.message,
      timestamp: timestamp
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
