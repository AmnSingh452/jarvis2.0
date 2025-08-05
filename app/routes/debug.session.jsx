import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  console.log("🔍 Debug session check initiated");
  
  try {
    // Dynamic imports to avoid bundling issues
    const { authenticate } = await import("../shopify.server");
    const db = await import("../db.server");
    
    const { session } = await authenticate.admin(request);
    
    const shopData = await db.default.shop.findUnique({
      where: { shopDomain: session.shop }
    });
    
    const installationLogs = await db.default.installationLog.findMany({
      where: { shopDomain: session.shop },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log("🔍 Session Debug:", {
      shopDomain: session.shop,
      hasAccessToken: !!session.accessToken,
      tokenLength: session.accessToken?.length,
      scopes: session.scope,
      dbRecord: !!shopData,
      tokenVersion: shopData?.tokenVersion,
      isActive: shopData?.isActive,
      installedAt: shopData?.installedAt,
      uninstalledAt: shopData?.uninstalledAt,
      installationLogsCount: installationLogs.length
    });
    
    return json({
      shop: session.shop,
      tokenVersion: shopData?.tokenVersion,
      isActive: shopData?.isActive,
      installedAt: shopData?.installedAt,
      uninstalledAt: shopData?.uninstalledAt,
      scopes: session.scope,
      hasAccessToken: !!session.accessToken,
      installationLogs: installationLogs.map(log => ({
        action: log.action,
        createdAt: log.createdAt,
        metadata: log.metadata
      }))
    });
    
  } catch (error) {
    console.log("❌ Debug session error:", error.message);
    return json({ error: error.message }, { status: 401 });
  }
};
