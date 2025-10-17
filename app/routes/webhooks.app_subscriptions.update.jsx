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

    // First, try to find existing subscription
    const subscriptionId = subscription.id ? subscription.id.toString() : null;
    let existingSubscription = null;

    if (subscriptionId) {
      existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain,
          shopifySubscriptionId: subscriptionId
        }
      });
    }

    // If no existing subscription found, try to find by shop domain and status
    if (!existingSubscription) {
      existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain,
          status: 'ACTIVE'
        }
      });
    }

    // If still no subscription found, CREATE a new one
    if (!existingSubscription && (subscription.status === 'active' || subscription.status === 'ACTIVE')) {
      console.log(`Creating new subscription for ${shopDomain}`);
      
      // Get the first available plan (should be Essential)
      const plan = await prisma.plan.findFirst({
        where: { isActive: true },
        orderBy: { price: 'asc' } // Get the cheapest plan first
      });

      if (!plan) {
        console.error(`No plans available to create subscription for ${shopDomain}`);
        return;
      }

      const newSubscription = await prisma.subscription.create({
        data: {
          shopDomain,
          planId: plan.id,
          status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
          shopifySubscriptionId: subscriptionId,
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          messagesUsed: 0,
          messagesLimit: plan.messagesLimit,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Created new subscription ${newSubscription.id} for ${shopDomain}`);
      return;
    }

    // If subscription exists, UPDATE it
    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
          shopifySubscriptionId: subscriptionId,
          updatedAt: new Date()
        }
      });
      console.log(`✅ Updated existing subscription ${existingSubscription.id} for ${shopDomain}`);
    }
    
    // Handle specific status changes
    if (subscription.status === 'cancelled' || subscription.status === 'CANCELLED') {
      console.log(`Subscription cancelled for ${shopDomain}`);
      // Update status to cancelled
      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });
      }
    } else if (subscription.status === 'active' || subscription.status === 'ACTIVE') {
      console.log(`Subscription activated for ${shopDomain}`);
      
      // Reset usage if it's a new billing cycle and subscription exists
      if (existingSubscription) {
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
        
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            messagesUsed: 0, // Reset usage for new billing cycle
            currentPeriodStart,
            currentPeriodEnd,
            status: 'ACTIVE',
            updatedAt: new Date()
          }
        });
        console.log(`✅ Reset usage counters for ${shopDomain}`);
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
