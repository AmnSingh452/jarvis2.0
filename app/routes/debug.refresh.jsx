import { json, redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  console.log("🧹 Debug force refresh initiated");
  
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return json({ error: "Shop parameter required. Use ?shop=your-store.myshopify.com" }, { status: 400 });
  }
  
  try {
    // Dynamic imports to avoid bundling issues
    const { authenticate } = await import("../shopify.server");
    const db = await import("../db.server");
    
    // Clear all sessions for this shop
    console.log(`🧹 Clearing all sessions for shop: ${shop}`);
    
    // Update shop status to force fresh auth
    await db.default.shop.updateMany({
      where: { shopDomain: shop },
      data: {
        isActive: false,
        tokenVersion: { increment: 1 }
      }
    });
    
    // Log the force refresh action
    await db.default.installationLog.create({
      data: {
        shopDomain: shop,
        action: "FORCE_REFRESH",
        metadata: {
          timestamp: new Date().toISOString(),
          reason: "Debug force refresh triggered"
        }
      }
    });
    
    console.log(`✅ Force refresh completed for: ${shop}`);
    
    // Redirect to auth login to trigger fresh authentication
    return redirect(`/auth/login?shop=${shop}`);
    
  } catch (error) {
    console.log("❌ Force refresh error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
