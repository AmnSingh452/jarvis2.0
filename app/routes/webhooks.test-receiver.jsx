import { json } from "@remix-run/node";

/**
 * Simple webhook receiver to test if ANY webhooks are coming through
 * This helps debug if the issue is webhook delivery or webhook processing
 */

export const action = async ({ request }) => {
  const timestamp = new Date().toISOString();
  
  // Log everything immediately
  console.log(`\n🟢 ===== WEBHOOK TEST RECEIVER - ${timestamp} =====`);
  console.log(`🟢 Method: ${request.method}`);
  console.log(`🟢 URL: ${request.url}`);
  
  // Get headers
  const headers = Object.fromEntries(request.headers.entries());
  console.log(`🟢 Headers:`, JSON.stringify(headers, null, 2));
  
  // Get body
  let body = '';
  try {
    body = await request.text();
    console.log(`🟢 Body:`, body);
  } catch (e) {
    console.log(`🟢 Body read error:`, e.message);
  }
  
  // Check if this looks like a Shopify webhook
  const shopHeader = headers['x-shopify-shop-domain'];
  const topicHeader = headers['x-shopify-topic'];
  const webhookId = headers['x-shopify-webhook-id'];
  
  if (shopHeader && topicHeader) {
    console.log(`🟢 ✅ VALID SHOPIFY WEBHOOK DETECTED:`);
    console.log(`🟢    Shop: ${shopHeader}`);
    console.log(`🟢    Topic: ${topicHeader}`);
    console.log(`🟢    ID: ${webhookId}`);
    
    if (topicHeader === 'app/uninstalled') {
      console.log(`🟢 🎯 THIS IS AN UNINSTALL WEBHOOK!`);
      
      // If this is an uninstall webhook, we should trigger our real webhook
      try {
        console.log(`🟢 🔄 Triggering real uninstall process...`);
        
        // Import the real webhook handler
        const { action: realWebhookHandler } = await import('./webhooks.app.uninstalled.jsx');
        
        // Create a new request object to pass to the real handler
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: body
        });
        
        const result = await realWebhookHandler({ request: newRequest });
        
        console.log(`🟢 ✅ Real webhook handler completed`);
        
        return new Response("OK - Test receiver + Real handler", { status: 200 });
        
      } catch (handlerError) {
        console.error(`🟢 ❌ Real webhook handler failed:`, handlerError);
        return new Response("OK - Test receiver (real handler failed)", { status: 200 });
      }
    }
  } else {
    console.log(`🟢 ⚠️ Not a Shopify webhook - missing required headers`);
  }
  
  console.log(`🟢 ===== WEBHOOK TEST RECEIVER END =====\n`);
  
  return new Response("OK - Test receiver", { status: 200 });
};

// Also support GET for testing
export const loader = async ({ request }) => {
  return json({
    message: "Webhook Test Receiver is active",
    endpoint: "/webhooks/test-receiver",
    timestamp: new Date().toISOString(),
    instructions: [
      "This endpoint logs all incoming webhook requests",
      "Use this to debug if webhooks are being delivered",
      "Check your server logs for webhook details"
    ]
  });
};
