import { json } from "@remix-run/node";
import db from "../db.server.js";

// API endpoint to cleanup invalid tokens and sessions
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    console.log(`🧹 Cleaning up invalid tokens for shop: ${shop}`);

    // Count existing records before cleanup
    const existingSessions = await db.session.count({
      where: { shop }
    });

    const existingShop = await db.shop.findUnique({
      where: { shopDomain: shop }  // Use shopDomain for Shop model
    });

    console.log(`📊 Found ${existingSessions} sessions and ${existingShop ? 1 : 0} shop records`);

    // Delete all sessions for this shop (sessions use 'shop' field)
    const deletedSessions = await db.session.deleteMany({
      where: { shop }
    });

    // Mark shop as inactive and clear token (shops use 'shopDomain' field)
    let shopUpdate = null;
    if (existingShop) {
      shopUpdate = await db.shop.update({
        where: { shopDomain: shop },
        data: { 
          isActive: false,
          accessToken: null,  // Clear the invalid token
          uninstalledAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Cleanup completed:`);
    console.log(`   - Deleted ${deletedSessions.count} sessions`);
    console.log(`   - Updated shop status: ${shopUpdate ? 'inactive' : 'no shop found'}`);

    return json({
      success: true,
      message: "Invalid tokens cleaned up successfully",
      details: {
        shop,
        deletedSessions: deletedSessions.count,
        shopUpdated: !!shopUpdate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Token cleanup error:", error);
    
    return json({
      success: false,
      error: "Failed to cleanup tokens",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function action({ request }) {
  // Support POST requests as well
  return loader({ request });
}
