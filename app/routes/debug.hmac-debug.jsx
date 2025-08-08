import { createHmac } from "node:crypto";

export const action = async ({ request }) => {
  console.log(`🔧 HMAC Debug Endpoint Called`);
  
  const headers = Object.fromEntries(request.headers.entries());
  const body = await request.text();
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const hmacHeader = headers['x-shopify-hmac-sha256'];
  
  console.log(`🔧 Debug Info:`);
  console.log(`   Body length: ${body.length}`);
  console.log(`   Body: ${body}`);
  console.log(`   HMAC Header: ${hmacHeader}`);
  console.log(`   Webhook Secret: ${webhookSecret ? 'SET' : 'NOT SET'}`);
  console.log(`   Secret Length: ${webhookSecret ? webhookSecret.length : 0}`);
  
  if (webhookSecret && body) {
    // Test different HMAC calculation methods
    const tests = [
      {
        name: "Base64 digest",
        method: () => {
          const hmac = createHmac('sha256', webhookSecret);
          hmac.update(body, 'utf8');
          return hmac.digest('base64');
        }
      },
      {
        name: "Hex digest",
        method: () => {
          const hmac = createHmac('sha256', webhookSecret);
          hmac.update(body, 'utf8');
          return hmac.digest('hex');
        }
      },
      {
        name: "Buffer approach",
        method: () => {
          const hmac = createHmac('sha256', webhookSecret);
          hmac.update(Buffer.from(body, 'utf8'));
          return hmac.digest('base64');
        }
      }
    ];
    
    console.log(`🔧 HMAC Test Results:`);
    tests.forEach(test => {
      try {
        const result = test.method();
        console.log(`   ${test.name}: ${result}`);
        console.log(`   Matches header: ${result === hmacHeader}`);
      } catch (error) {
        console.log(`   ${test.name}: ERROR - ${error.message}`);
      }
    });
  }
  
  return new Response(JSON.stringify({
    success: true,
    hmacHeader,
    bodyLength: body.length,
    secretSet: !!webhookSecret
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
