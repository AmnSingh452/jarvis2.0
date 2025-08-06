import { authenticate } from "../shopify.server";
import db from "../db.server";
import { TokenCleanupService } from "../../enhanced-token-cleanup.js";

export const action = async ({ request }) => {
  console.log(`🔔 Webhook received: ${request.method} ${request.url}`);
  
  // Log all headers for debugging
  const headers = Object.fromEntries(request.headers.entries());
  console.log(`🔔 Headers:`, headers);
  
  // Check if this looks like a Shopify webhook
  const shopHeader = headers['x-shopify-shop-domain'];
  const topicHeader = headers['x-shopify-topic'];
  
  console.log(`🔔 Shop from header: ${shopHeader}`);
  console.log(`🔔 Topic from header: ${topicHeader}`);

  try {
    // Try to authenticate the webhook
    const { shop, session, topic } = await authenticate.webhook(request);
    console.log(`✅ Webhook authenticated successfully for shop: ${shop}, topic: ${topic}`);

    try {
      console.log(`🧹 Processing enhanced uninstallation cleanup for shop: ${shop}`);
      
      // Use enhanced cleanup service
      const cleanupService = new TokenCleanupService();
      const result = await cleanupService.cleanupOnUninstall(shop);
      
      console.log(`✅ Enhanced cleanup completed for ${shop}:`, result);
      
      return new Response("OK", { status: 200 });
      
    } catch (cleanupError) {
      console.error(`❌ Error processing uninstallation for ${shop}:`, cleanupError);
      
      // Fallback to basic cleanup if enhanced fails
      try {
        console.log(`🔄 Attempting fallback cleanup for ${shop}`);
        
        // Basic cleanup
        const deletedSessions = await db.session.deleteMany({ 
          where: { shop } 
        });
        
        const updatedShop = await db.shop.updateMany({
          where: { shopDomain: shop },
          data: { 
            isActive: false,
            uninstalledAt: new Date(),
            accessToken: null,
            tokenVersion: { increment: 1 }
          }
        });
        
        console.log(`✅ Fallback cleanup completed - Sessions: ${deletedSessions.count}, Shops: ${updatedShop.count}`);
        
        return new Response("OK - Fallback", { status: 200 });
        
      } catch (fallbackError) {
        console.error(`❌ Fallback cleanup also failed for ${shop}:`, fallbackError);
        return new Response("Cleanup Failed", { status: 500 });
      }
    }

  } catch (authError) {
    console.error(`❌ Webhook authentication failed:`, authError);
    console.error(`❌ Error details:`, authError.message);
    console.error(`❌ Error stack:`, authError.stack);
    
    // If authentication fails but we have shop info from headers, try manual cleanup
    if (shopHeader && topicHeader === 'app/uninstalled') {
      console.log(`🔄 Authentication failed, but attempting cleanup based on headers for shop: ${shopHeader}`);
      
      try {
        const cleanupService = new TokenCleanupService();
        const result = await cleanupService.cleanupOnUninstall(shopHeader);
        console.log(`✅ Manual cleanup completed for ${shopHeader}:`, result);
        return new Response("OK - Manual Cleanup", { status: 200 });
      } catch (manualError) {
        console.error(`❌ Manual cleanup failed:`, manualError);
        return new Response("Manual Cleanup Failed", { status: 500 });
      }
    }
    
    return new Response("Authentication Failed", { status: 401 });
  }
};
