import prisma from "./app/db.server.js";

/**
 * Manual fix script to add shop data to Shop table
 * This resolves the external API integration issue
 */

async function fixShopData() {
  const shopDomain = "aman-chatbot-test.myshopify.com";
  
  try {
    console.log(`🔧 Fixing shop data for: ${shopDomain}`);
    
    // Get the session data first
    const session = await prisma.session.findFirst({
      where: { shop: shopDomain },
      select: {
        accessToken: true,
        scope: true,
        id: true
      }
    });
    
    if (!session) {
      console.error(`❌ No session found for ${shopDomain}`);
      return;
    }
    
    console.log(`✅ Found session with token: ${session.accessToken.substring(0, 15)}...`);
    
    // Add/update shop record
    const shopRecord = await prisma.shop.upsert({
      where: { shopDomain: shopDomain },
      update: {
        accessToken: session.accessToken,
        isActive: true,
        uninstalledAt: null,
        tokenVersion: { increment: 1 }
      },
      create: {
        shopDomain: shopDomain,
        accessToken: session.accessToken,
        installedAt: new Date(),
        isActive: true,
        tokenVersion: 1
      }
    });
    
    console.log(`✅ Shop record created/updated:`, {
      shopDomain: shopRecord.shopDomain,
      hasAccessToken: !!shopRecord.accessToken,
      tokenPreview: shopRecord.accessToken.substring(0, 15) + "...",
      isActive: shopRecord.isActive,
      tokenVersion: shopRecord.tokenVersion
    });
    
    // Verify the fix
    const verification = await prisma.shop.findFirst({
      where: { shopDomain: shopDomain }
    });
    
    if (verification && verification.accessToken) {
      console.log(`🎯 SUCCESS: Shop data fix completed!`);
      console.log(`   - Shop: ${verification.shopDomain}`);
      console.log(`   - Token: ${verification.accessToken.substring(0, 15)}...`);
      console.log(`   - Active: ${verification.isActive}`);
      console.log(`🚀 External API calls should now work!`);
    } else {
      console.error(`❌ Fix verification failed`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing shop data:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixShopData();
