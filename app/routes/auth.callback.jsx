import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  console.log("🔐 Authentication callback initiated");
  console.log("📍 Request URL:", request.url);
  console.log("📍 Request method:", request.method);
  
  try {
    console.log(`trying to fetch session`);
    const { session } = await authenticate.admin(request);
    console.log(`session:`, session);
    
    if (session) {
      console.log(`✅ Authentication successful for shop: ${session.shop}`);
      
      // Save or update shop data in the Shop table
      try {
        await db.shop.upsert({
          where: { shopDomain: session.shop },
          update: {
            accessToken: session.accessToken,
            isActive: true,
            tokenVersion: { increment: 1 },
            uninstalledAt: null // Clear uninstall timestamp if it was set
          },
          create: {
            shopDomain: session.shop,
            accessToken: session.accessToken,
            installedAt: new Date(),
            isActive: true,
            tokenVersion: 1
          }
        });
        
        console.log(`💾 Shop data saved/updated for: ${session.shop}`);
        
        // Log installation event
        await db.installationLog.create({
          data: {
            shopDomain: session.shop,
            action: "INSTALLED",
            metadata: {
              tokenVersion: 1,
              scopes: session.scope,
              timestamp: new Date().toISOString()
            }
          }
        });
        
        console.log(`📝 Installation logged for: ${session.shop}`);
        
        // Redirect to main app after successful authentication
        console.log("🔄 Redirecting to main app...");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/app`
          }
        });
        
      } catch (dbError) {
        console.error("session is invalid");
        console.error("❌ Database error during shop setup:", dbError);
        // Don't fail the auth process, but log the error
        // Still redirect to app even if DB operations fail
        console.log("🔄 Redirecting to main app despite DB error...");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/app`
          }
        });
      }
    }
    
    // If no session, something went wrong
    console.log("❌ No session found after authentication");
    return null;
  } catch (error) {
    console.error("❌ Authentication callback error:", error);
    throw error;
  }
};
