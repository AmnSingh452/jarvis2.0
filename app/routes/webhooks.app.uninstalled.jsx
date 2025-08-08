import { authenticate } from "../shopify.server";
import db from "../db.server";
import { TokenCleanupService } from "../../enhanced-token-cleanup.js";

// Add immediate logging to see if this file is even being loaded
console.log(`🔔 webhooks.app.uninstalled.jsx file loaded at ${new Date().toISOString()}`);

export const action = async ({ request }) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 ===== APP UNINSTALL WEBHOOK TRIGGERED ===== ${timestamp}`);
  console.log(`🔔 Webhook received: ${request.method} ${request.url}`);
  
  // Log all headers for debugging
  const headers = Object.fromEntries(request.headers.entries());
  console.log(`🔔 ALL HEADERS:`, JSON.stringify(headers, null, 2));
  
  // Check if this looks like a Shopify webhook
  const shopHeader = headers['x-shopify-shop-domain'];
  const topicHeader = headers['x-shopify-topic'];
  const webhookId = headers['x-shopify-webhook-id'];
  
  console.log(`🔔 WEBHOOK DETAILS:`);
  console.log(`   Shop: ${shopHeader}`);
  console.log(`   Topic: ${topicHeader}`);
  console.log(`   Webhook ID: ${webhookId}`);
  
  // Get request body for more info
  let bodyText = '';
  try {
    bodyText = await request.text();
    console.log(`🔔 WEBHOOK BODY:`, bodyText);
  } catch (e) {
    console.log(`🔔 Could not read webhook body:`, e.message);
  }

  // Try authenticated approach first, but have fallback
  try {
    // Try to authenticate the webhook
    const { shop, session, topic } = await authenticate.webhook(request);
    console.log(`✅ Webhook authenticated successfully for shop: ${shop}, topic: ${topic}`);

    return await processUninstall(shop);

  } catch (authError) {
    console.error(`❌ Webhook authentication failed:`, authError.message);
    console.error(`❌ Auth error details:`, authError);
    
    // If authentication fails but we have valid Shopify headers, proceed with manual cleanup
    if (shopHeader && topicHeader === 'app/uninstalled') {
      console.log(`🔄 Authentication failed, but attempting cleanup based on headers for shop: ${shopHeader}`);
      return await processUninstall(shopHeader);
    }
    
    console.error(`❌ No valid shop information found in headers`);
    return new Response("Authentication Failed - No Shop Info", { status: 400 });
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
