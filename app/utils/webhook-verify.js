import crypto from "crypto";

/**
 * Verify Shopify webhook HMAC signature
 * This ensures webhooks are actually from Shopify
 */
export function verifyWebhookSignature(data, signature, secret) {
  if (!signature || !secret) {
    console.warn("⚠️ Missing webhook signature or secret");
    return false;
  }

  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    
    // Use timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(cleanSignature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    
    if (signatureBuffer.length !== calculatedBuffer.length) {
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
    
    if (isValid) {
      console.log("✅ Webhook HMAC signature verified successfully");
    } else {
      console.error("❌ Webhook HMAC signature verification failed");
    }
    
    return isValid;
    
  } catch (error) {
    console.error("❌ Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Extract shop domain from webhook safely
 */
export function extractShopDomain(headers) {
  return headers['x-shopify-shop-domain'] || 
         headers['X-Shopify-Shop-Domain'] ||
         null;
}

/**
 * Validate webhook topic
 */
export function validateWebhookTopic(headers, expectedTopic) {
  const topic = headers['x-shopify-topic'] || headers['X-Shopify-Topic'];
  return topic === expectedTopic;
}

/**
 * Enhanced webhook authentication with fallback
 */
export async function authenticateWebhook(request, authenticate) {
  const headers = Object.fromEntries(request.headers.entries());
  
  console.log("🔐 Starting webhook authentication...");
  
  // Try Shopify's built-in authentication first
  try {
    const result = await authenticate.webhook(request);
    console.log("✅ Shopify authentication successful");
    return { success: true, data: result, method: 'shopify' };
  } catch (authError) {
    console.warn("⚠️ Shopify authentication failed, trying manual verification");
    
    // Manual HMAC verification as fallback
    const signature = headers['x-shopify-hmac-sha256'];
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    
    if (signature && secret) {
      // We need to get the raw body for HMAC verification
      const clonedRequest = request.clone();
      const bodyText = await clonedRequest.text();
      
      if (verifyWebhookSignature(bodyText, signature, secret)) {
        const shop = extractShopDomain(headers);
        const topic = headers['x-shopify-topic'];
        
        console.log("✅ Manual HMAC verification successful");
        return { 
          success: true, 
          data: { shop, topic }, 
          method: 'manual' 
        };
      }
    }
    
    console.error("❌ All authentication methods failed");
    return { 
      success: false, 
      error: authError.message,
      method: 'none'
    };
  }
}
