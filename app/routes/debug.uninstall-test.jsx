import { json } from "@remix-run/node";

/**
 * Uninstall Webhook Debug Tool
 * Use this to test and debug the uninstall webhook process
 */

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "status";
  const shop = url.searchParams.get("shop");

  console.log(`🔍 Uninstall Debug - Action: ${action}, Shop: ${shop}`);

  try {
    // Import required modules
    const db = await import("../db.server");
    const { authenticate } = await import("../shopify.server");
    const { TokenCleanupService } = await import("../../enhanced-token-cleanup.js");

    if (action === "status") {
      // Check current status for a shop
      if (!shop) {
        return json({ error: "Shop parameter required for status check. Use ?action=status&shop=your-store.myshopify.com" }, { status: 400 });
      }

      const shopRecord = await db.default.shop.findFirst({
        where: { shopDomain: shop }
      });

      const sessionCount = await db.default.session.count({
        where: { shop: shop }
      });

      const subscriptions = await db.default.subscription.findMany({
        where: { shopDomain: shop }
      });

      const recentLogs = await db.default.installationLog.findMany({
        where: { shopDomain: shop },
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      return json({
        shop,
        shopRecord,
        sessionCount,
        subscriptions,
        recentLogs,
        message: `Current status for ${shop}`
      });
    }

    if (action === "simulate") {
      // Simulate the uninstall webhook process
      if (!shop) {
        return json({ error: "Shop parameter required for simulation. Use ?action=simulate&shop=your-store.myshopify.com" }, { status: 400 });
      }

      console.log(`🧪 Simulating uninstall webhook for ${shop}`);
      
      const cleanupService = new TokenCleanupService();
      const result = await cleanupService.cleanupOnUninstall(shop);
      
      return json({
        success: true,
        shop,
        simulationResult: result,
        message: `Uninstall simulation completed for ${shop}`,
        note: "This was a simulation - the app is NOT actually uninstalled"
      });
    }

    if (action === "webhook-test") {
      // Test if webhook endpoint is accessible
      const webhookUrl = `${process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com'}/webhooks/app/uninstalled`;
      
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Shop-Domain': shop || 'test-shop.myshopify.com',
            'X-Shopify-Topic': 'app/uninstalled',
            'X-Shopify-Webhook-Id': 'test-webhook-id'
          },
          body: JSON.stringify({ test: true })
        });

        return json({
          webhookUrl,
          testResponse: {
            status: testResponse.status,
            statusText: testResponse.statusText,
            accessible: testResponse.status < 500
          },
          message: "Webhook endpoint test completed"
        });
      } catch (fetchError) {
        return json({
          webhookUrl,
          error: fetchError.message,
          message: "Webhook endpoint test failed"
        });
      }
    }

    if (action === "check-webhooks") {
      // Check registered webhooks (requires active session)
      try {
        const { admin, session } = await authenticate.admin(request);
        
        const response = await admin.rest.resources.Webhook.all({
          session,
        });
        
        const uninstallWebhooks = response.data.filter(w => w.topic === 'app/uninstalled');
        
        return json({
          success: true,
          shop: session.shop,
          allWebhooks: response.data,
          uninstallWebhooks,
          webhookCount: response.data.length,
          hasUninstallWebhook: uninstallWebhooks.length > 0,
          message: "Webhook registration check completed"
        });
      } catch (authError) {
        return json({
          error: "Authentication required - visit this URL from within your installed app",
          authError: authError.message
        }, { status: 401 });
      }
    }

    if (action === "register-webhook") {
      // Manually register webhook (requires active session)
      try {
        const { admin, session } = await authenticate.admin(request);
        
        const webhook = new admin.rest.resources.Webhook({session});
        webhook.topic = "app/uninstalled";
        webhook.address = `${process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com'}/webhooks/app/uninstalled`;
        webhook.format = "json";
        
        await webhook.save({
          update: true,
        });
        
        return json({
          success: true,
          webhook: webhook,
          shop: session.shop,
          message: "Uninstall webhook registered successfully"
        });
      } catch (authError) {
        return json({
          error: "Authentication required - visit this URL from within your installed app",
          authError: authError.message
        }, { status: 401 });
      }
    }

    // Default: show available options
    return json({
      info: "Uninstall Webhook Debug Tool",
      appUrl: process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com',
      availableActions: {
        status: "Check current shop status (requires shop parameter)",
        simulate: "Simulate uninstall process (requires shop parameter)",
        "webhook-test": "Test webhook endpoint accessibility",
        "check-webhooks": "List registered webhooks (requires app session)",
        "register-webhook": "Register uninstall webhook (requires app session)"
      },
      usage: {
        status: "?action=status&shop=your-store.myshopify.com",
        simulate: "?action=simulate&shop=your-store.myshopify.com",
        "webhook-test": "?action=webhook-test&shop=your-store.myshopify.com",
        "check-webhooks": "?action=check-webhooks (visit from app)",
        "register-webhook": "?action=register-webhook (visit from app)"
      },
      instructions: [
        "1. First check webhook registration with ?action=check-webhooks",
        "2. If no webhook, register with ?action=register-webhook", 
        "3. Test endpoint with ?action=webhook-test",
        "4. Check shop status with ?action=status&shop=YOURSHOP",
        "5. Simulate cleanup with ?action=simulate&shop=YOURSHOP"
      ]
    });

  } catch (error) {
    console.error("Uninstall debug error:", error);
    return json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
};
