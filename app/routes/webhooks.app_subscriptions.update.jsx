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
    
    console.log(`Subscription update for ${shopDomain}:`, {
      id: subscription.id,
      status: subscription.status,
      name: subscription.name
    });
    
    // Update subscription status in database
    await prisma.subscription.updateMany({
      where: { 
        shopDomain,
        shopifySubscriptionId: subscription.id.toString()
      },
      data: {
        status: subscription.status.toUpperCase(),
        updatedAt: new Date()
      }
    });
    
    // Handle specific status changes
    if (subscription.status === 'cancelled') {
      console.log(`Subscription cancelled for ${shopDomain}`);
      // You could send notification emails here
    } else if (subscription.status === 'active') {
      console.log(`Subscription activated for ${shopDomain}`);
      // Reset usage if it's a new billing cycle
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
      
      await prisma.subscription.updateMany({
        where: { 
          shopDomain,
          shopifySubscriptionId: subscription.id.toString()
        },
        data: {
          messagesUsed: 0, // Reset usage for new billing cycle
          currentPeriodStart,
          currentPeriodEnd,
          updatedAt: new Date()
        }
      });
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
