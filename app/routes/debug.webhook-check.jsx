import { json } from "@remix-run/node";

/**
 * Webhook Registration Checker
 * This helps debug webhook registration issues
 */

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "check";

  console.log(`🔍 Webhook Debug - Action: ${action}`);

  try {
    // Import Shopify admin API
    const { authenticate } = await import("../shopify.server.js");
    
    if (action === "list") {
      // Try to get shop info and list webhooks
      const { admin, session } = await authenticate.admin(request);
      
      const response = await admin.rest.resources.Webhook.all({
        session,
      });
      
      return json({
        success: true,
        shop: session.shop,
        webhooks: response.data,
        message: "Current webhooks registered for this app"
      });
    }
    
    if (action === "register") {
      // Try to register the webhook manually
      const { admin, session } = await authenticate.admin(request);
      
      const webhook = new admin.rest.resources.Webhook({session});
      webhook.topic = "app/uninstalled";
      webhook.address = `${process.env.SHOPIFY_APP_URL}/webhooks/app/uninstalled`;
      webhook.format = "json";
      
      await webhook.save({
        update: true,
      });
      
      return json({
        success: true,
        webhook: webhook,
        message: "Webhook registered successfully"
      });
    }

    // Default: show configuration info
    return json({
      info: "Webhook Debug Tool",
      currentConfig: {
        appUrl: process.env.SHOPIFY_APP_URL,
        webhookUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/app/uninstalled`,
        hasWebhookSecret: !!process.env.SHOPIFY_WEBHOOK_SECRET,
        apiVersion: "2025-07"
      },
      availableActions: {
        check: "Show current configuration",
        list: "List all registered webhooks (requires shop session)",
        register: "Manually register webhook (requires shop session)"
      },
      usage: {
        check: "?action=check",
        list: "?action=list (visit from installed app)",
        register: "?action=register (visit from installed app)"
      }
    });

  } catch (error) {
    console.error("Webhook debug error:", error);
    return json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
};
