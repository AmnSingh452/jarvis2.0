import { createHmac, timingSafeEqual } from "node:crypto";

console.log(`🔔 customers.data_request.jsx loaded at ${new Date().toISOString()}`);

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

// Handle GET requests (for testing/health checks)
export const loader = async ({ request }) => {
  console.log("📋 Customer data request endpoint accessed via GET");
  return new Response(JSON.stringify({ 
    message: "Customer data request endpoint is active",
    method: "GET",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const action = async ({ request }) => {
  // Import server-only modules inside the action function
  const { authenticate } = await import("../shopify.server");
  
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 ===== CUSTOMER DATA REQUEST WEBHOOK ===== ${timestamp}`);
  
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
    console.log(`🔔 Data request payload:`, payload);
    
    // Required fields from Shopify:
    const {
      shop_id,
      shop_domain,
      orders_requested,
      customer,
      data_request
    } = payload;
    
    console.log(`📋 Processing data request for customer: ${customer?.id}`);
    console.log(`📋 Shop: ${shop_domain} (ID: ${shop_id})`);
    console.log(`📋 Orders requested: ${orders_requested?.length || 0}`);
    
    // GDPR Compliance Response:
    // You need to provide the customer's data or confirm you don't store any
    // For this chatbot app, we likely don't store customer PII
    
    const responseData = {
      message: "Jarvis2.0 Chatbot - Customer Data Request Processed",
      timestamp: timestamp,
      shop_domain: shop_domain,
      customer_id: customer?.id,
      data_stored: "This app does not store customer personal data beyond basic order references for recommendation purposes",
      contact_email: "support@jarvis2.com", // Replace with your support email
      status: "completed"
    };
    
    console.log(`✅ Data request processed:`, responseData);
    console.log(`✅ ===== CUSTOMER DATA REQUEST COMPLETED =====\n`);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`❌ Error processing customer data request:`, error);
    console.error(`❌ Error stack:`, error.stack);
    
    return new Response(JSON.stringify({
      error: "Failed to process data request",
      message: error.message,
      timestamp: timestamp
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
