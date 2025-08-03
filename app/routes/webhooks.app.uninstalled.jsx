import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`🔔 Received ${topic} webhook for ${shop}`);

  try {
    console.log(`🧹 Processing uninstallation for shop: ${shop}`);
    
    // Mark shop as inactive and set uninstall timestamp
    const updatedShop = await db.shop.updateMany({
      where: { shopDomain: shop },
      data: { 
        isActive: false,
        uninstalledAt: new Date(),
        accessToken: null  // Clear the access token on uninstall
      }
    });
    console.log(`✅ Marked ${updatedShop.count} shop(s) as inactive for ${shop}`);
    
    // Clean up sessions for this shop (invalidate all tokens)
    const deletedSessions = await db.session.deleteMany({ 
      where: { shop } 
    });
    console.log(`✅ Deleted ${deletedSessions.count} session(s) for ${shop}`);
    
    // Log uninstallation event
    await db.installationLog.create({
      data: {
        shopDomain: shop,
        action: "UNINSTALLED",
        metadata: {
          timestamp: new Date().toISOString(),
          sessionsDeleted: deletedSessions.count
        }
      }
    });
    
    console.log(`🎉 Successfully processed uninstallation for ${shop}`);
    
  } catch (error) {
    console.error(`❌ Error processing uninstallation for ${shop}:`, error);
    // Don't throw error - webhook should still return success
  }

  return new Response();
};
