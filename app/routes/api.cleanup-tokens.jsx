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
      // Complete cleanup - remove all tokens and sessions using transaction
      const result = await db.$transaction(async (tx) => {
        // 1. Delete all sessions
        const deletedSessions = await tx.session.deleteMany({
          where: { shop }
        });

        // 2. Mark shop as inactive and clear all tokens
        const shopUpdate = await tx.shop.updateMany({
          where: { shopDomain: shop },
          data: { 
            isActive: false,
            accessToken: null, // Critical: Clear the access token
            uninstalledAt: new Date(),
            tokenVersion: { increment: 1 }, // Increment to invalidate old tokens
            updatedAt: new Date()
          }
        });

        // 3. Also clean up potential shop name variations
        const cleanupVariations = await tx.shop.updateMany({
          where: {
            OR: [
              { shopDomain: { contains: shop.replace('.myshopify.com', '') } },
              { shopDomain: shop }
            ]
          },
          data: { 
            isActive: false,
            accessToken: null,
            uninstalledAt: new Date(),
            tokenVersion: { increment: 1 },
            updatedAt: new Date()
          }
        });

        // 4. Clean up related data
        await tx.widgetSettings.deleteMany({ where: { shopDomain: shop } });
        await tx.subscription.deleteMany({ where: { shopDomain: shop } });

        return {
          deletedSessions: deletedSessions.count,
          updatedShops: shopUpdate.count,
          cleanupVariations: cleanupVariations.count
        };
      });

      console.log(`✅ Force cleanup completed:`);
      console.log(`   - Deleted ${result.deletedSessions} sessions`);
      console.log(`   - Updated ${result.updatedShops} shop records`);
      console.log(`   - Cleanup variations ${result.cleanupVariations} records`);

      return json({
        success: true,
        message: "Force cleanup completed - fresh authentication required",
        details: {
          shop,
          deletedSessions: result.deletedSessions,
          updatedShops: result.updatedShops,
          cleanupVariations: result.cleanupVariations,
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
