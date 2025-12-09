import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  console.log("🔐 Traditional OAuth callback (non-embedded apps only)");
  console.log("📍 Request URL:", request.url);
  
  try {
    const { session } = await authenticate.admin(request);
    console.log(`session:`, session);
    
    if (session) {
      console.log(`✅ Authentication successful for shop: ${session.shop}`);
      
      // Check for pending referral code
      let referralCode = null;
      try {
        const pendingReferral = await db.pendingReferral.findUnique({
          where: { shopDomain: session.shop },
        });
        
        if (pendingReferral && pendingReferral.expiresAt > new Date()) {
          referralCode = pendingReferral.referralCode;
          console.log(`📎 Retrieved referral code from pending: ${referralCode}`);
          
          // Delete the pending referral after use
          await db.pendingReferral.delete({
            where: { shopDomain: session.shop },
          });
        } else if (pendingReferral) {
          console.log(`⚠️ Pending referral expired for ${session.shop}`);
          // Clean up expired referral
          await db.pendingReferral.delete({
            where: { shopDomain: session.shop },
          }).catch(() => {});
        }
      } catch (err) {
        console.log("Note: No pending referral found (this is normal for direct installs)");
      }
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
            action: "TRADITIONAL_OAUTH_INSTALL",
            metadata: {
              tokenVersion: 1,
              scopes: session.scope,
              timestamp: new Date().toISOString(),
              method: "Traditional OAuth Callback (Non-embedded)"
            }
          }
        });
        
        console.log(`📝 Traditional OAuth installation logged for: ${session.shop}`);
        
        // Handle referral tracking if referral code was provided
        if (referralCode) {
          try {
            const agency = await db.agency.findUnique({
              where: { referralCode },
              select: { id: true, name: true, active: true },
            });
            
            if (agency && agency.active) {
              // Create or update merchant referral
              await db.merchantReferral.upsert({
                where: { shopDomain: session.shop },
                update: {
                  agencyId: agency.id,
                  active: true,
                },
                create: {
                  shopDomain: session.shop,
                  agencyId: agency.id,
                  referredAt: new Date(),
                  active: true,
                  lifetimeRevenue: 0,
                },
              });
              
              console.log(`🎯 Merchant ${session.shop} linked to agency: ${agency.name} (${referralCode})`);
            } else {
              console.log(`⚠️ Invalid or inactive referral code: ${referralCode}`);
            }
          } catch (refError) {
            console.error("❌ Error processing referral:", refError);
            // Don't fail auth process due to referral tracking error
          }
        }
        
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
