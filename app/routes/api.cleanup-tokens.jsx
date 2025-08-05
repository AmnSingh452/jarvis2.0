import { json } from "@remix-run/node";

// API endpoint to manually cleanup stale tokens and force fresh authentication
export async function action({ request }) {
  try {
    // Import server module inside the function to avoid client bundling issues
    const db = (await import("../db.server.js")).default;
    
    const formData = await request.formData();
    const shop = formData.get("shop");
    const action = formData.get("action");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    console.log(`🧹 Manual token cleanup requested for shop: ${shop}, action: ${action}`);

    if (action === "force_cleanup") {
      // Complete cleanup - remove all tokens and sessions
      const deletedSessions = await db.session.deleteMany({
        where: { shop }
      });

      // Mark shop as inactive and clear all tokens
      const shopUpdate = await db.shop.updateMany({
        where: { shopDomain: shop },
        data: { 
          isActive: false,
          accessToken: null,
          uninstalledAt: new Date(),
          tokenVersion: { increment: 1 }, // Increment to invalidate old tokens
          updatedAt: new Date()
        }
      });

      console.log(`✅ Force cleanup completed:`);
      console.log(`   - Deleted ${deletedSessions.count} sessions`);
      console.log(`   - Updated ${shopUpdate.count} shop records`);

      return json({
        success: true,
        message: "Force cleanup completed - fresh authentication required",
        details: {
          shop,
          deletedSessions: deletedSessions.count,
          updatedShops: shopUpdate.count,
          action: "force_cleanup",
          timestamp: new Date().toISOString()
        }
      });
    }

    if (action === "refresh_tokens") {
      // Just invalidate current tokens without marking as uninstalled
      const shopUpdate = await db.shop.updateMany({
        where: { shopDomain: shop },
        data: { 
          accessToken: null,
          tokenVersion: { increment: 1 },
          updatedAt: new Date()
        }
      });

      return json({
        success: true,
        message: "Tokens invalidated - re-authentication required",
        details: {
          shop,
          updatedShops: shopUpdate.count,
          action: "refresh_tokens",
          timestamp: new Date().toISOString()
        }
      });
    }

    return json({ error: "Invalid action. Use: force_cleanup, refresh_tokens" }, { status: 400 });

  } catch (error) {
    console.error("❌ Token cleanup error:", error);
    
    return json({
      success: false,
      error: "Token cleanup failed",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({
    message: "Token Cleanup API - Use POST with shop and action parameters",
    actions: {
      force_cleanup: "Complete cleanup - removes all sessions and tokens",
      refresh_tokens: "Invalidate tokens only - preserves shop data"
    },
    usage: {
      method: "POST",
      parameters: {
        shop: "shop-domain.myshopify.com",
        action: "force_cleanup | refresh_tokens"
      }
    }
  });
}
