import { json } from "@remix-run/node";
import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const action = url.searchParams.get("action") || "status";
  
  if (!shop) {
    return json({ 
      error: "Shop parameter required",
      usage: "?shop=your-store.myshopify.com&action=status|clear|verify"
    }, { status: 400 });
  }

  console.log(`🔬 Testing Helper - Action: ${action} for Shop: ${shop}`);

  try {
    switch (action) {
      case "status":
        return await getShopStatus(shop);
      
      case "clear":
        return await clearShopData(shop);
      
      case "verify":
        return await verifyInstallation(shop);
        
      case "sessions":
        return await getSessionInfo(shop);
        
      case "simulate-uninstall":
        return await simulateUninstall(shop);
        
      case "webhook-test":
        return await testWebhookEndpoint(shop);
        
      default:
        return json({
          error: "Invalid action",
          availableActions: ["status", "clear", "verify", "sessions", "simulate-uninstall", "webhook-test"]
        }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ Testing helper error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

async function getShopStatus(shop) {
  console.log(`📊 Getting status for: ${shop}`);
  
  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
    include: {
      subscription: true
    }
  });
  
  const sessions = await db.session.findMany({
    where: { shop: shop },
    select: {
      id: true,
      isOnline: true,
      scope: true,
      expires: true,
      createdAt: true
    }
  });
  
  const installationLogs = await db.installationLog.findMany({
    where: { shopDomain: shop },
    orderBy: { timestamp: 'desc' },
    take: 5
  });
  
  const widgetSettings = await db.widgetSettings.findUnique({
    where: { shopDomain: shop }
  });
  
  return json({
    shop,
    timestamp: new Date().toISOString(),
    status: {
      shopRecord: shopRecord ? {
        id: shopRecord.id,
        isActive: shopRecord.isActive,
        tokenVersion: shopRecord.tokenVersion,
        installedAt: shopRecord.installedAt,
        uninstalledAt: shopRecord.uninstalledAt,
        hasAccessToken: !!shopRecord.accessToken,
        hasSubscription: !!shopRecord.subscription
      } : null,
      sessions: {
        count: sessions.length,
        details: sessions.map(s => ({
          id: s.id,
          isOnline: s.isOnline,
          scope: s.scope,
          expires: s.expires,
          createdAt: s.createdAt
        }))
      },
      installationHistory: installationLogs.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        metadata: log.metadata
      })),
      widgetSettings: !!widgetSettings,
      webhookInfo: {
        expectedWebhookUrl: `${process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com'}/webhooks/app/uninstalled`,
        webhookSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
        lastWebhookLog: installationLogs.find(log => log.action.includes('UNINSTALL')) || null
      },
      nextSteps: getNextSteps(shopRecord, sessions)
    }
  });
}

async function clearShopData(shop) {
  console.log(`🧹 Clearing all data for: ${shop}`);
  
  // Delete in proper order (foreign key constraints)
  const deletedPayments = await db.payment.deleteMany({
    where: { 
      subscription: { 
        shopDomain: shop 
      } 
    }
  });
  
  const deletedSubscriptions = await db.subscription.deleteMany({
    where: { shopDomain: shop }
  });
  
  const deletedWidgetSettings = await db.widgetSettings.deleteMany({
    where: { shopDomain: shop }
  });
  
  const deletedInstallationLogs = await db.installationLog.deleteMany({
    where: { shopDomain: shop }
  });
  
  const deletedSessions = await db.session.deleteMany({
    where: { shop: shop }
  });
  
  const deletedShops = await db.shop.deleteMany({
    where: { shopDomain: shop }
  });
  
  // Log the cleanup
  await db.installationLog.create({
    data: {
      shopDomain: shop,
      action: "TESTING_DATA_CLEARED",
      metadata: {
        timestamp: new Date().toISOString(),
        deletedCounts: {
          payments: deletedPayments.count,
          subscriptions: deletedSubscriptions.count,
          widgetSettings: deletedWidgetSettings.count,
          installationLogs: deletedInstallationLogs.count,
          sessions: deletedSessions.count,
          shops: deletedShops.count
        },
        reason: "Testing - complete data cleanup"
      }
    }
  });
  
  console.log(`✅ Data cleared for ${shop}:`, {
    payments: deletedPayments.count,
    subscriptions: deletedSubscriptions.count,
    widgetSettings: deletedWidgetSettings.count,
    installationLogs: deletedInstallationLogs.count,
    sessions: deletedSessions.count,
    shops: deletedShops.count
  });
  
  return json({
    success: true,
    shop,
    message: `All data cleared for ${shop}`,
    deletedCounts: {
      payments: deletedPayments.count,
      subscriptions: deletedSubscriptions.count,
      widgetSettings: deletedWidgetSettings.count,
      installationLogs: deletedInstallationLogs.count,
      sessions: deletedSessions.count,
      shops: deletedShops.count
    },
    nextStep: `Install the app to test fresh installation flow`
  });
}

async function verifyInstallation(shop) {
  console.log(`✅ Verifying installation for: ${shop}`);
  
  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop }
  });
  
  const sessions = await db.session.findMany({
    where: { shop: shop }
  });
  
  const latestLog = await db.installationLog.findFirst({
    where: { shopDomain: shop },
    orderBy: { timestamp: 'desc' }
  });
  
  const isProperlyInstalled = shopRecord && shopRecord.isActive && shopRecord.accessToken && sessions.length > 0;
  
  return json({
    shop,
    verification: {
      isProperlyInstalled,
      shopRecord: !!shopRecord,
      isActive: shopRecord?.isActive || false,
      hasAccessToken: !!(shopRecord?.accessToken),
      hasValidSessions: sessions.length > 0,
      tokenVersion: shopRecord?.tokenVersion || 0,
      lastAction: latestLog?.action || "none"
    },
    issues: getInstallationIssues(shopRecord, sessions),
    recommendations: getRecommendations(shopRecord, sessions)
  });
}

async function getSessionInfo(shop) {
  const sessions = await db.session.findMany({
    where: { shop: shop }
  });
  
  return json({
    shop,
    sessions: sessions.map(s => ({
      id: s.id,
      isOnline: s.isOnline,
      scope: s.scope,
      expires: s.expires,
      createdAt: s.createdAt,
      hasAccessToken: !!s.accessToken,
      userId: s.userId
    }))
  });
}

async function simulateUninstall(shop) {
  console.log(`🧪 Simulating uninstall webhook for: ${shop}`);
  
  try {
    // Import the cleanup service that's used in the actual webhook
    const { TokenCleanupService } = await import("../../enhanced-token-cleanup.js");
    const cleanupService = new TokenCleanupService();
    
    console.log(`🧹 Processing simulated uninstallation cleanup for shop: ${shop}`);
    
    const result = await cleanupService.cleanupOnUninstall(shop);
    
    console.log(`✅ Simulated cleanup completed for ${shop}:`, result);
    
    // Log the simulated uninstall
    await db.installationLog.create({
      data: {
        shopDomain: shop,
        action: "SIMULATED_UNINSTALL",
        metadata: {
          timestamp: new Date().toISOString(),
          method: "manual simulation",
          cleanupResult: result,
          reason: "Testing uninstall flow - webhook not triggered"
        }
      }
    });
    
    return json({
      success: true,
      shop,
      message: `Simulated uninstall completed for ${shop}`,
      cleanupResult: result,
      note: "This simulates what should happen when the webhook is triggered"
    });
    
  } catch (error) {
    console.error(`❌ Simulated uninstall error for ${shop}:`, error);
    
    // Fallback to basic cleanup
    try {
      console.log(`🔄 Attempting fallback cleanup for ${shop}`);
      
      const deletedSessions = await db.session.deleteMany({ 
        where: { shop } 
      });
      
      const updatedShop = await db.shop.updateMany({
        where: { shopDomain: shop },
        data: { 
          isActive: false,
          uninstalledAt: new Date(),
          accessToken: null,
          tokenVersion: { increment: 1 }
        }
      });
      
      await db.installationLog.create({
        data: {
          shopDomain: shop,
          action: "SIMULATED_UNINSTALL_FALLBACK",
          metadata: {
            timestamp: new Date().toISOString(),
            deletedSessions: deletedSessions.count,
            updatedShops: updatedShop.count,
            error: error.message
          }
        }
      });
      
      console.log(`✅ Fallback cleanup completed - Sessions: ${deletedSessions.count}, Shops: ${updatedShop.count}`);
      
      return json({
        success: true,
        shop,
        message: "Simulated uninstall completed with fallback method",
        fallbackResult: {
          deletedSessions: deletedSessions.count,
          updatedShops: updatedShop.count
        },
        error: error.message
      });
      
    } catch (fallbackError) {
      console.error(`❌ Fallback cleanup also failed for ${shop}:`, fallbackError);
      return json({ 
        error: `Both cleanup methods failed: ${error.message}, ${fallbackError.message}` 
      }, { status: 500 });
    }
  }
}

async function testWebhookEndpoint(shop) {
  console.log(`🧪 Testing webhook endpoint for: ${shop}`);
  
  try {
    // Test if our webhook endpoint is accessible
    const webhookUrl = "https://jarvis2-0-djg1.onrender.com/webhooks/app/uninstalled";
    
    // Create a mock Shopify webhook payload
    const mockPayload = {
      id: "test",
      domain: shop,
      timestamp: new Date().toISOString()
    };
    
    const testHeaders = {
      'x-shopify-shop-domain': shop,
      'x-shopify-topic': 'app/uninstalled',
      'x-shopify-hmac-sha256': 'test-hmac',
      'content-type': 'application/json'
    };
    
    console.log(`🔗 Testing webhook URL: ${webhookUrl}`);
    console.log(`📋 Mock headers:`, testHeaders);
    
    // Since we can't easily make external requests from here, let's check our configuration
    const webhookConfig = {
      endpoint: webhookUrl,
      expectedHeaders: testHeaders,
      mockPayload,
      currentTime: new Date().toISOString(),
      shopifyApp: {
        apiVersion: "2025-07",
        webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET ? "SET" : "NOT SET",
        appUrl: process.env.SHOPIFY_APP_URL
      },
      troubleshooting: {
        possibleIssues: [
          "Webhook not registered in Shopify Partners dashboard",
          "App needs to be reinstalled to register webhooks",
          "Webhook URL not accessible from Shopify servers", 
          "API version mismatch between registration and handler",
          "HMAC verification failing due to incorrect secret"
        ],
        nextSteps: [
          "1. Reinstall the app to trigger webhook registration",
          "2. Check Shopify Partners dashboard webhook settings", 
          "3. Verify all environment variables are set in Render",
          "4. Test manual webhook call from app context"
        ]
      }
    };
    
    return json({
      success: true,
      shop,
      message: "Webhook endpoint configuration test",
      config: webhookConfig,
      recommendation: "Install the app, then uninstall to test if webhook triggers"
    });
    
  } catch (error) {
    console.error(`❌ Webhook test error for ${shop}:`, error);
    return json({ 
      error: error.message,
      shop,
      message: "Webhook test failed"
    }, { status: 500 });
  }
}

function getNextSteps(shopRecord, sessions) {
  if (!shopRecord && sessions.length === 0) {
    return "Shop not installed. Install the app to test installation flow.";
  }
  
  if (!shopRecord && sessions.length > 0) {
    return "Sessions exist but no shop record. Install the app to trigger shop data creation.";
  }
  
  if (shopRecord && !shopRecord.isActive) {
    return "Shop was uninstalled. Reinstall the app to test reinstallation flow.";
  }
  
  if (shopRecord && shopRecord.isActive) {
    return "Shop is properly installed and active. Test app functionality.";
  }
  
  return "Unknown state. Check individual components.";
}

function getInstallationIssues(shopRecord, sessions) {
  const issues = [];
  
  if (!shopRecord) {
    issues.push("No shop record found in database");
  }
  
  if (shopRecord && !shopRecord.isActive) {
    issues.push("Shop exists but is marked as inactive");
  }
  
  if (shopRecord && !shopRecord.accessToken) {
    issues.push("Shop record exists but has no access token");
  }
  
  if (sessions.length === 0) {
    issues.push("No sessions found for this shop");
  }
  
  return issues;
}

function getRecommendations(shopRecord, sessions) {
  const recommendations = [];
  
  if (!shopRecord && sessions.length > 0) {
    recommendations.push("Sessions exist but no shop data - this indicates embedded auth bypassed callback. Install the app to trigger shop data creation.");
  }
  
  if (shopRecord && !shopRecord.isActive) {
    recommendations.push("Shop was uninstalled. Test reinstallation flow by installing the app again.");
  }
  
  if (sessions.length === 0) {
    recommendations.push("No sessions found. Clear all data and reinstall the app.");
  }
  
  return recommendations;
}
