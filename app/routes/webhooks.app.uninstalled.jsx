import { authenticate } from "../shopify.server";
import db from "../db.server";
import { TokenCleanupService } from "../../enhanced-token-cleanup.js";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`🔔 Received ${topic} webhook for ${shop}`);

  try {
    console.log(`🧹 Processing enhanced uninstallation cleanup for shop: ${shop}`);
    
    // Use enhanced cleanup service
    const cleanupService = new TokenCleanupService();
    const result = await cleanupService.cleanupOnUninstall(shop);
    
    console.log(`✅ Enhanced cleanup completed for ${shop}:`, result);
    
  } catch (error) {
    console.error(`❌ Error processing uninstallation for ${shop}:`, error);
    
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
      
    } catch (fallbackError) {
      console.error(`❌ Fallback cleanup also failed for ${shop}:`, fallbackError);
    }
  }

  return new Response();
};
