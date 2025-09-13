import prisma from "./app/db.server.js";

/**
 * Database cleanup utilities for app uninstall/reinstall cycle
 */

/**
 * Clean up all data for a specific shop
 * Call this when a shop uninstalls the app
 */
export async function cleanupShopData(shopDomain) {
  try {
    console.log(`🧹 Cleaning up data for shop: ${shopDomain}`);
    
    // Delete all sessions for this shop
    const deletedSessions = await prisma.session.deleteMany({
      where: { shop: shopDomain }
    });
    
    // Delete from Shop table if exists
    const deletedShops = await prisma.shop.deleteMany({
      where: { shopDomain: shopDomain }
    });
    
    console.log(`✅ Cleanup completed for ${shopDomain}:`);
    console.log(`   - Sessions deleted: ${deletedSessions.count}`);
    console.log(`   - Shop records deleted: ${deletedShops.count}`);
    
    return {
      success: true,
      sessionsDeleted: deletedSessions.count,
      shopsDeleted: deletedShops.count
    };
    
  } catch (error) {
    console.error(`❌ Error cleaning up ${shopDomain}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify shop has fresh installation (no old data)
 */
export async function verifyFreshInstallation(shopDomain) {
  try {
    const existingSessions = await prisma.session.findMany({
      where: { shop: shopDomain }
    });
    
    const existingShops = await prisma.shop.findMany({
      where: { shopDomain: shopDomain }
    });
    
    // Auto-fix: If session exists but shop record doesn't, create it
    if (existingSessions.length > 0 && existingShops.length === 0) {
      console.log(`🔧 Auto-fixing: Adding shop record for ${shopDomain}`);
      const latestSession = existingSessions[0];
      
      if (latestSession.accessToken) {
        try {
          await prisma.shop.create({
            data: {
              shopDomain: shopDomain,
              accessToken: latestSession.accessToken,
              installedAt: new Date(),
              isActive: true,
              tokenVersion: 1
            }
          });
          console.log(`✅ Shop record created for ${shopDomain}`);
        } catch (createError) {
          console.error(`❌ Failed to create shop record:`, createError);
        }
      }
    }
    
    // Re-fetch after potential fix
    const updatedShops = await prisma.shop.findMany({
      where: { shopDomain: shopDomain }
    });
    
    const hasOldData = existingSessions.length > 0 || updatedShops.length > 0;
    
    if (hasOldData) {
      console.log(`⚠️ Found data for ${shopDomain}:`);
      console.log(`   - Sessions: ${existingSessions.length}`);
      console.log(`   - Shop records: ${updatedShops.length}`);
    } else {
      console.log(`✅ Fresh installation confirmed for ${shopDomain}`);
    }
    
    return {
      isFresh: !hasOldData,
      oldSessions: existingSessions.length,
      oldShops: updatedShops.length,
      hasValidToken: existingSessions.length > 0 && existingSessions[0].accessToken ? true : false
    };
    
  } catch (error) {
    console.error(`❌ Error verifying installation for ${shopDomain}:`, error);
    return {
      isFresh: false,
      error: error.message
    };
  }
}

/**
 * Get current session info for a shop
 */
export async function getShopSessionInfo(shopDomain) {
  try {
    const sessions = await prisma.session.findMany({
      where: { shop: shopDomain },
      select: {
        id: true,
        accessToken: true,
        isOnline: true,
        expires: true,
        scope: true
      }
    });
    
    return {
      shop: shopDomain,
      sessionCount: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        tokenPreview: s.accessToken ? `${s.accessToken.substring(0, 20)}...` : null,
        isOnline: s.isOnline,
        expires: s.expires,
        scope: s.scope
      }))
    };
    
  } catch (error) {
    console.error(`❌ Error getting session info for ${shopDomain}:`, error);
    return {
      shop: shopDomain,
      error: error.message
    };
  }
}

// CLI usage
if (process.argv.length > 2) {
  const command = process.argv[2];
  const shopDomain = process.argv[3];
  
  switch (command) {
    case "cleanup":
      if (!shopDomain) {
        console.log("Usage: node cleanup-db.js cleanup <shop-domain>");
        process.exit(1);
      }
      cleanupShopData(shopDomain).then(result => {
        console.log("Cleanup result:", result);
        process.exit(0);
      });
      break;
      
    case "verify":
      if (!shopDomain) {
        console.log("Usage: node cleanup-db.js verify <shop-domain>");
        process.exit(1);
      }
      verifyFreshInstallation(shopDomain).then(result => {
        console.log("Verification result:", result);
        process.exit(0);
      });
      break;
      
    case "info":
      if (!shopDomain) {
        console.log("Usage: node cleanup-db.js info <shop-domain>");
        process.exit(1);
      }
      getShopSessionInfo(shopDomain).then(result => {
        console.log("Session info:", result);
        process.exit(0);
      });
      break;
      
    default:
      console.log("Available commands:");
      console.log("  cleanup <shop-domain> - Clean up all data for a shop");
      console.log("  verify <shop-domain>  - Verify fresh installation");
      console.log("  info <shop-domain>    - Get session information");
      break;
  }
}
