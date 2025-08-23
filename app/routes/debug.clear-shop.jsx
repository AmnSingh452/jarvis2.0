import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  console.log("🗑️ Debug clear shop data initiated");
  
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return json({ error: "Shop parameter required. Use ?shop=your-store.myshopify.com" }, { status: 400 });
  }
  
  try {
    // Dynamic imports to avoid bundling issues
    const db = await import("../db.server");
    
    console.log(`🗑️ Clearing all data for shop: ${shop}`);
    
    // Delete in proper order to handle foreign key constraints
    
    // 1. Delete subscription records first
    const deletedSubscriptions = await db.default.subscription.deleteMany({
      where: { shopDomain: shop }
    });
    
    // 2. Delete installation logs
    const deletedInstallationLogs = await db.default.installationLog.deleteMany({
      where: { shopDomain: shop }
    });
    
    // 3. Delete sessions
    const deletedSessions = await db.default.session.deleteMany({
      where: { shop: shop }
    });
    
    // 4. Finally delete shop records
    const deletedShops = await db.default.shop.deleteMany({
      where: { shopDomain: shop }
    });
    
        await db.default.installationLog.create({
          data: {
            shopDomain: shop,
            action: "DEBUG_CLEAR",
            metadata: {
              timestamp: new Date().toISOString(),
              deletedSessions: deletedSessions.count,
              deletedShops: deletedShops.count,
              deletedSubscriptions: deletedSubscriptions.count,
              deletedInstallationLogs: deletedInstallationLogs.count,
              reason: "Debug shop data cleared - next install will be fresh"
            }
          }
        });
        
        console.log(`✅ Shop data cleared for: ${shop}`);
        console.log(`   - Sessions deleted: ${deletedSessions.count}`);
        console.log(`   - Shop records deleted: ${deletedShops.count}`);
        console.log(`   - Subscriptions deleted: ${deletedSubscriptions.count}`);
        console.log(`   - Installation logs deleted: ${deletedInstallationLogs.count}`);
        
        return json({ 
          success: true,
          message: `Shop data cleared for ${shop}. Next installation will trigger auth.callback.jsx`,
          deletedSessions: deletedSessions.count,
          deletedShops: deletedShops.count,
          deletedSubscriptions: deletedSubscriptions.count,
          deletedInstallationLogs: deletedInstallationLogs.count
        });  } catch (error) {
    console.log("❌ Clear shop data error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
