import { createHmac } from "node:crypto";

export const action = async ({ request }) => {
  console.log(`🔧 HMAC Test Endpoint Called`);
  
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const testBody = "test webhook body";
  const headers = Object.fromEntries(request.headers.entries());
  
  console.log(`🔧 Environment Check:`);
  console.log(`   SHOPIFY_WEBHOOK_SECRET: ${webhookSecret ? 'SET' : 'NOT SET'}`);
  console.log(`   Headers:`, headers);
  
  if (webhookSecret) {
    // Generate test HMAC
    const hmac = createHmac('sha256', webhookSecret);
    hmac.update(testBody, 'utf8');
    const testSignature = hmac.digest('base64');
    
    console.log(`🔧 Test HMAC Generation:`);
    console.log(`   Test Body: "${testBody}"`);
    console.log(`   Generated HMAC: ${testSignature}`);
  }
  
  return new Response(JSON.stringify({
    webhookSecretConfigured: !!webhookSecret,
    timestamp: new Date().toISOString(),
    ready: true
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const loader = async () => {
  return new Response("HMAC Test Endpoint - Use POST method", { status: 200 });
};
