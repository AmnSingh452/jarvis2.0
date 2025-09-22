const { PrismaClient } = require('@prisma/client');

async function debugMultiStoreIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging Multi-Store Issues...\n');
    
    // 1. Check all shops in database
    console.log('📊 Checking all shops in database:');
    const allShops = await prisma.shop.findMany({
      orderBy: { installedAt: 'desc' }
    });
    
    console.log(`Found ${allShops.length} shops:`);
    allShops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.shopDomain}`);
      console.log(`   - Active: ${shop.isActive}`);
      console.log(`   - Installed: ${shop.installedAt}`);
      console.log(`   - Uninstalled: ${shop.uninstalledAt || 'Never'}`);
      console.log(`   - Token Version: ${shop.tokenVersion}`);
      console.log(`   - Has Access Token: ${shop.accessToken ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // 2. Check sessions for each shop
    console.log('🔐 Checking sessions:');
    const allSessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const sessionsByShop = {};
    allSessions.forEach(session => {
      if (!sessionsByShop[session.shop]) {
        sessionsByShop[session.shop] = [];
      }
      sessionsByShop[session.shop].push(session);
    });
    
    Object.keys(sessionsByShop).forEach(shop => {
      console.log(`${shop}:`);
      console.log(`   - Sessions: ${sessionsByShop[shop].length}`);
      const latestSession = sessionsByShop[shop][0];
      console.log(`   - Latest Session: ${latestSession.id}`);
      console.log(`   - Expires: ${latestSession.expires || 'Never'}`);
      console.log(`   - Online: ${latestSession.isOnline}`);
      console.log('');
    });
    
    // 3. Check widget settings
    console.log('⚙️ Checking widget settings:');
    const allWidgetSettings = await prisma.widgetSettings.findMany();
    
    console.log(`Found ${allWidgetSettings.length} widget configurations:`);
    allWidgetSettings.forEach((setting, index) => {
      console.log(`${index + 1}. ${setting.shopDomain}`);
      console.log(`   - Enabled: ${setting.isEnabled}`);
      console.log(`   - Created: ${setting.createdAt}`);
      console.log('');
    });
    
    // 4. Check analytics data
    console.log('📈 Checking analytics data:');
    const analyticsCount = await prisma.chatConversation.groupBy({
      by: ['shopDomain'],
      _count: { id: true }
    });
    
    if (analyticsCount.length > 0) {
      console.log('Analytics data by shop:');
      analyticsCount.forEach(item => {
        console.log(`   - ${item.shopDomain}: ${item._count.id} conversations`);
      });
    } else {
      console.log('   - No analytics data found');
    }
    
    console.log('\n🔧 Recommendations:');
    
    // Check for common issues
    const inactiveShops = allShops.filter(shop => !shop.isActive);
    if (inactiveShops.length > 0) {
      console.log('❌ Found inactive shops:');
      inactiveShops.forEach(shop => {
        console.log(`   - ${shop.shopDomain} (uninstalled: ${shop.uninstalledAt})`);
      });
      console.log('   💡 Recommendation: These shops need to reinstall the app');
    }
    
    const shopsWithoutTokens = allShops.filter(shop => !shop.accessToken);
    if (shopsWithoutTokens.length > 0) {
      console.log('❌ Found shops without access tokens:');
      shopsWithoutTokens.forEach(shop => {
        console.log(`   - ${shop.shopDomain}`);
      });
      console.log('   💡 Recommendation: These shops need to complete OAuth flow');
    }
    
    const expiredSessions = allSessions.filter(session => {
      return session.expires && new Date(session.expires) < new Date();
    });
    if (expiredSessions.length > 0) {
      console.log('❌ Found expired sessions:');
      expiredSessions.forEach(session => {
        console.log(`   - ${session.shop} (expired: ${session.expires})`);
      });
      console.log('   💡 Recommendation: These shops need to re-authenticate');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugMultiStoreIssue();
}

module.exports = { debugMultiStoreIssue };
