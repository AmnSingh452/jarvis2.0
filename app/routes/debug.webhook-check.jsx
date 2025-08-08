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
      // Use GraphQL instead of REST to list webhooks
      const { admin, session } = await authenticate.admin(request);
      
      const response = await admin.graphql(`
        #graphql
        query webhookSubscriptions {
          webhookSubscriptions(first: 50) {
            edges {
              node {
                id
                callbackUrl
                topic
                format
                createdAt
                updatedAt
              }
            }
          }
        }
      `);
      
      const responseJson = await response.json();
      
      return json({
        success: true,
        shop: session.shop,
        webhooks: responseJson.data.webhookSubscriptions.edges.map(edge => edge.node),
        message: "Current webhooks registered for this app (via GraphQL)"
      });
    }
    
    if (action === "register") {
      // Use GraphQL instead of REST to register webhook
      const { admin, session } = await authenticate.admin(request);
      
      const response = await admin.graphql(`
        #graphql
        mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
            webhookSubscription {
              id
              callbackUrl
              topic
              format
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          topic: "APP_UNINSTALLED",
          webhookSubscription: {
            callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/app/uninstalled`,
            format: "JSON"
          }
        }
      });
      
      const responseJson = await response.json();
      
      return json({
        success: true,
        webhook: responseJson.data.webhookSubscriptionCreate.webhookSubscription,
        errors: responseJson.data.webhookSubscriptionCreate.userErrors,
        message: "Webhook registered successfully via GraphQL"
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
