import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`🔔 Received ${topic} webhook for ${shop}`);

  try {
    // Clean up ALL data for this shop when they uninstall
    console.log(`🧹 Cleaning up data for uninstalled shop: ${shop}`);
    
    // Delete all sessions for this shop (includes all tokens)
    const deletedSessions = await db.session.deleteMany({ 
      where: { shop } 
    });
    console.log(`✅ Deleted ${deletedSessions.count} session(s) for ${shop}`);
    
    // Also clean up from Shop table if it exists
    const deletedShops = await db.shop.deleteMany({ 
      where: { shopDomain: shop } 
    });
    console.log(`✅ Deleted ${deletedShops.count} shop record(s) for ${shop}`);
    
    // Log successful cleanup
    console.log(`🎉 Successfully cleaned up all data for ${shop}`);
    
  } catch (error) {
    console.error(`❌ Error cleaning up data for ${shop}:`, error);
    // Don't throw error - webhook should still return success
  }

  return new Response();
};
