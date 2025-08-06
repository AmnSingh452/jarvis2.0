import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  console.log("🔄 Manual auth refresh route accessed");
  console.log("📍 Request URL:", request.url);
  
  try {
    const { session } = await authenticate.admin(request);
    console.log(`🔄 Manual refresh session:`, session);
    
    if (session) {
      console.log(`✅ Manual refresh successful for shop: ${session.shop}`);
      
      // Force update shop data 
      try {
        await db.shop.upsert({
          where: { shopDomain: session.shop },
          update: {
            accessToken: session.accessToken,
            isActive: true,
            tokenVersion: { increment: 1 },
            uninstalledAt: null
          },
          create: {
            shopDomain: session.shop,
            accessToken: session.accessToken,
            installedAt: new Date(),
            isActive: true,
            tokenVersion: 1
          }
        });
        
        console.log(`💾 Shop data refreshed for: ${session.shop}`);
        
        // Log refresh event
        await db.installationLog.create({
          data: {
            shopDomain: session.shop,
            action: "TOKEN_REFRESHED",
            metadata: {
              scopes: session.scope,
              timestamp: new Date().toISOString(),
              refreshType: "manual"
            }
          }
        });
        
        console.log(`📝 Token refresh logged for: ${session.shop}`);
        
        // Redirect to main app
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/app`
          }
        });
        
      } catch (dbError) {
        console.error("❌ Database error during token refresh:", dbError);
      }
    }
    
    return new Response("Token refresh completed", { status: 200 });
  } catch (error) {
    console.error("❌ Manual auth refresh error:", error);
    throw error;
  }
};
