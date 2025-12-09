/**
 * Register Partner Program Webhooks
 * Registers billing and uninstall webhooks for partner commission tracking
 */

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const APP_URL = process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com';

/**
 * Webhook topics to register for partner program
 */
const PARTNER_WEBHOOKS = [
  {
    topic: 'APP_SUBSCRIPTIONS_UPDATE',
    callbackUrl: `${APP_URL}/api/partner-billing`,
    description: 'App subscription updates (GraphQL billing)',
  },
  {
    topic: 'APP_UNINSTALLED',
    callbackUrl: `${APP_URL}/api/partner-billing`,
    description: 'App uninstallation',
  },
];

/**
 * Register a single webhook
 */
async function registerWebhook(admin, topic, callbackUrl) {
  try {
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
        topic,
        webhookSubscription: {
          callbackUrl,
          format: "JSON"
        }
      }
    });

    const responseJson = await response.json();
    const webhookData = responseJson.data.webhookSubscriptionCreate;

    if (webhookData.userErrors.length > 0) {
      return {
        success: false,
        topic,
        errors: webhookData.userErrors,
      };
    }

    return {
      success: true,
      topic,
      webhook: webhookData.webhookSubscription,
    };
  } catch (error) {
    return {
      success: false,
      topic,
      error: error.message,
    };
  }
}

/**
 * Get all existing webhooks
 */
async function listWebhooks(admin) {
  try {
    const listResponse = await admin.graphql(`
      #graphql
      query webhookSubscriptions {
        webhookSubscriptions(first: 100) {
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
    return listResponseJson.data.webhookSubscriptions.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return [];
  }
}

/**
 * Main webhook registration endpoint
 */
export const action = async ({ request }) => {
  try {
    console.log("🔧 Partner program webhook registration triggered");
    
    const { admin, session } = await authenticate.admin(request);
    
    if (!session?.shop) {
      return json({ error: "No valid session found" }, { status: 401 });
    }
    
    console.log(`📝 Registering partner webhooks for shop: ${session.shop}`);
    
    // Get existing webhooks
    const existingWebhooks = await listWebhooks(admin);
    console.log(`📊 Found ${existingWebhooks.length} existing webhooks`);
    
    // Register each webhook
    const results = [];
    
    for (const webhook of PARTNER_WEBHOOKS) {
      // Check if webhook already exists
      const existing = existingWebhooks.find(
        w => w.topic === webhook.topic && w.callbackUrl === webhook.callbackUrl
      );
      
      if (existing) {
        console.log(`✓ Webhook already exists: ${webhook.topic}`);
        results.push({
          success: true,
          topic: webhook.topic,
          message: 'Already registered',
          webhook: existing,
        });
      } else {
        console.log(`→ Registering webhook: ${webhook.topic}`);
        const result = await registerWebhook(admin, webhook.topic, webhook.callbackUrl);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Registered: ${webhook.topic}`);
        } else {
          console.log(`❌ Failed: ${webhook.topic}`, result.errors || result.error);
        }
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📋 Registration Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Get updated webhook list
    const updatedWebhooks = await listWebhooks(admin);
    const partnerWebhooks = updatedWebhooks.filter(w => 
      PARTNER_WEBHOOKS.some(pw => pw.topic === w.topic)
    );
    
    return json({
      success: failed === 0,
      message: `Registered ${successful} of ${PARTNER_WEBHOOKS.length} webhooks`,
      shop: session.shop,
      results,
      summary: {
        total: PARTNER_WEBHOOKS.length,
        successful,
        failed,
        existingWebhooks: partnerWebhooks.length,
      },
      webhooks: partnerWebhooks,
    });
    
  } catch (error) {
    console.error("❌ Error registering partner webhooks:", error);
    
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
