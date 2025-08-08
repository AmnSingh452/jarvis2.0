import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Simple API endpoint to register the uninstall webhook
 * Access via: /api/register-webhook
 */

export const action = async ({ request }) => {
  try {
    console.log("🔧 Manual webhook registration triggered");
    
    const { admin, session } = await authenticate.admin(request);
    
    if (!session?.shop) {
      return json({ error: "No valid session found" }, { status: 401 });
    }
    
    console.log(`📝 Registering webhook for shop: ${session.shop}`);
    
    // Create the webhook using GraphQL instead of REST
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
          callbackUrl: `https://jarvis2-0-djg1.onrender.com/webhooks/app/uninstalled`,
          format: "JSON"
        }
      }
    });

    const responseJson = await response.json();
    const webhookData = responseJson.data.webhookSubscriptionCreate;

    if (webhookData.userErrors.length > 0) {
      console.log(`❌ Webhook registration errors:`, webhookData.userErrors);
      return json({
        success: false,
        errors: webhookData.userErrors,
        message: "Webhook registration failed"
      }, { status: 400 });
    }

    console.log(`✅ Webhook registered successfully for ${session.shop}`);
    console.log(`   - Topic: ${webhookData.webhookSubscription.topic}`);
    console.log(`   - Address: ${webhookData.webhookSubscription.callbackUrl}`);
    console.log(`   - ID: ${webhookData.webhookSubscription.id}`);
    
    // Verify registration by listing all webhooks using GraphQL
    const listResponse = await admin.graphql(`
      #graphql
      query webhookSubscriptions {
        webhookSubscriptions(first: 50) {
          edges {
            node {
              id
              callbackUrl
              topic
              format
            }
          }
        }
      }
    `);
    
    const listResponseJson = await listResponse.json();
    const allWebhooks = listResponseJson.data.webhookSubscriptions.edges.map(edge => edge.node);
    const uninstallWebhooks = allWebhooks.filter(w => w.topic === 'APP_UNINSTALLED');
    
    return json({
      success: true,
      message: "Webhook registered successfully",
      shop: session.shop,
      webhook: {
        id: webhookData.webhookSubscription.id,
        topic: webhookData.webhookSubscription.topic,
        address: webhookData.webhookSubscription.callbackUrl,
        format: webhookData.webhookSubscription.format
      },
      verification: {
        totalWebhooks: allWebhooks.length,
        uninstallWebhooks: uninstallWebhooks.length,
        hasUninstallWebhook: uninstallWebhooks.length > 0
      }
    });
    
  } catch (error) {
    console.error("❌ Error registering webhook:", error);
    
    return json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
};

export const loader = async ({ request }) => {
  // Handle GET requests too
  return action({ request });
};
