import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

export async function action({ request }) {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);
    
    console.log(`Received webhook: ${topic} for shop: ${shop}`);
    
    switch (topic) {
      case "APP_SUBSCRIPTIONS_UPDATE":
        await handleSubscriptionUpdate(shop, payload);
        break;
        
      case "APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT":
        await handleApproachingLimit(shop, payload);
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

async function handleSubscriptionUpdate(shopDomain, payload) {
  const prisma = new PrismaClient();
  
  try {
    const subscription = payload.app_subscription;
    
    // Enhanced logging to debug the webhook payload
    console.log(`Full subscription webhook payload for ${shopDomain}:`, JSON.stringify(payload, null, 2));
    console.log(`Subscription update for ${shopDomain}:`, {
      id: subscription.id,
      status: subscription.status,
      name: subscription.name,
      fullSubscriptionObject: subscription
    });

    // Handle case where subscription.id might be undefined
    if (!subscription.id) {
      console.warn(`Subscription ID is undefined for ${shopDomain}. Using alternative identification method.`);
      
      // Try to find subscription by shop domain and plan name
      const existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain,
          status: 'ACTIVE'
        }
      });

      if (existingSubscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
            updatedAt: new Date()
          }
        });
        console.log(`Updated subscription ${existingSubscription.id} for ${shopDomain}`);
      } else {
        console.log(`No existing subscription found for ${shopDomain} to update`);
      }
    } else {
      // Normal flow with subscription ID
      const subscriptionId = subscription.id.toString();
      
      // Update subscription status in database
      await prisma.subscription.updateMany({
        where: { 
          shopDomain,
          shopifySubscriptionId: subscriptionId
        },
        data: {
          status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
          updatedAt: new Date()
        }
      });
    }
    
    // Handle specific status changes
    if (subscription.status === 'cancelled' || subscription.status === 'CANCELLED') {
      console.log(`Subscription cancelled for ${shopDomain}`);
      // You could send notification emails here
    } else if (subscription.status === 'active' || subscription.status === 'ACTIVE') {
      console.log(`Subscription activated for ${shopDomain}`);
      
      // Reset usage if it's a new billing cycle
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
      
      const subscriptionId = subscription.id ? subscription.id.toString() : null;
      
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { 
            shopDomain,
            shopifySubscriptionId: subscriptionId
          },
          data: {
            messagesUsed: 0, // Reset usage for new billing cycle
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: new Date()
          }
        });
      } else {
        // Update by shop domain if no subscription ID
        await prisma.subscription.updateMany({
          where: { 
            shopDomain,
            status: 'ACTIVE'
          },
          data: {
            messagesUsed: 0,
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: new Date()
          }
        });
      }
    }
    
  } catch (error) {
    console.error("Subscription update error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function handleApproachingLimit(shopDomain, payload) {
  const prisma = new PrismaClient();
  
  try {
    console.log(`Approaching usage limit for ${shopDomain}:`, payload);
    
    // You could implement notifications here:
    // - Send email to merchant
    // - Show in-app notification
    // - Log for analytics
    
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain }
    });
    
    if (subscription) {
      const usagePercentage = (subscription.messagesUsed / subscription.messagesLimit) * 100;
      console.log(`Current usage: ${subscription.messagesUsed}/${subscription.messagesLimit} (${usagePercentage.toFixed(1)}%)`);
      
      // You could trigger upgrade suggestions here
      if (usagePercentage >= 80) {
        console.log(`Consider suggesting upgrade for ${shopDomain}`);
      }
    }
    
  } catch (error) {
    console.error("Approaching limit handler error:", error);
  } finally {
    await prisma.$disconnect();
  }
}
