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
      price: subscription.price,
      fullSubscriptionObject: subscription
    });

    // Determine which plan was purchased based on subscription name or price
    let targetPlan = null;
    
    // Method 1: Match by subscription name
    if (subscription.name) {
      const planName = subscription.name.toLowerCase();
      console.log(`🔍 Analyzing plan name: "${subscription.name}"`);
      
      // Check for yearly vs monthly billing cycle
      const isYearly = planName.includes('yearly') || planName.includes('annual') || planName.includes('year');
      const billingCycle = isYearly ? 'yearly' : 'monthly';
      
      if (planName.includes('essential') || planName.includes('basic')) {
        targetPlan = await prisma.plan.findFirst({
          where: { 
            name: { contains: 'Essential', mode: 'insensitive' },
            billingCycle: billingCycle
          }
        });
        console.log(`📋 Matched to Essential ${billingCycle} plan by name`);
      } else if (planName.includes('pro') || planName.includes('sales')) {
        targetPlan = await prisma.plan.findFirst({
          where: { 
            name: { contains: 'Sales Pro', mode: 'insensitive' },
            billingCycle: billingCycle
          }
        });
        console.log(`📋 Matched to Sales Pro ${billingCycle} plan by name`);
      }
    }
    
    // Method 2: Match by price if name matching fails
    if (!targetPlan && subscription.price) {
      const price = parseFloat(subscription.price);
      console.log(`🔍 Analyzing plan price: $${price}`);
      
      targetPlan = await prisma.plan.findFirst({
        where: { 
          price: {
            gte: price - 1, // Allow some price variance
            lte: price + 1
          }
        }
      });
      console.log(`📋 Matched plan by price: ${targetPlan?.name || 'None found'}`);
    }
    
    // Fallback: Get Essential monthly plan as default
    if (!targetPlan) {
      console.log(`⚠️ Could not determine plan from webhook, defaulting to Essential Monthly for ${shopDomain}`);
      targetPlan = await prisma.plan.findFirst({
        where: { 
          name: { contains: 'Essential', mode: 'insensitive' },
          billingCycle: 'monthly'
        }
      });
    }

    if (!targetPlan) {
      console.error(`❌ No plans available to create subscription for ${shopDomain}`);
      return;
    }

    console.log(`🎯 Detected plan: ${targetPlan.name} ($${targetPlan.price}) for ${shopDomain}`);

    // First, try to find existing subscription
    const subscriptionId = subscription.id ? subscription.id.toString() : null;
    let existingSubscription = null;

    if (subscriptionId) {
      existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain,
          shopifyChargeId: subscriptionId
        }
      });
    }

    // If no existing subscription found, try to find by shop domain
    if (!existingSubscription) {
      existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // If still no subscription found, CREATE a new one
    if (!existingSubscription && (subscription.status === 'active' || subscription.status === 'ACTIVE')) {
      console.log(`🆕 Creating new subscription for ${shopDomain} with plan ${targetPlan.name}`);

      const newSubscription = await prisma.subscription.create({
        data: {
          shopDomain,
          planId: targetPlan.id,
          status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
          shopifyChargeId: subscriptionId,
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          messagesUsed: 0,
          messagesLimit: targetPlan.messagesLimit
        }
      });

      console.log(`✅ Created new subscription ${newSubscription.id} for ${shopDomain} with plan ${targetPlan.name}`);
      return;
    }

    // If subscription exists, UPDATE it (including plan upgrade/downgrade)
    if (existingSubscription) {
      const updateData = {
        status: subscription.status ? subscription.status.toUpperCase() : 'ACTIVE',
        shopifyChargeId: subscriptionId,
        updatedAt: new Date()
      };

      // If the plan changed, update the plan
      if (existingSubscription.planId !== targetPlan.id) {
        updateData.planId = targetPlan.id;
        updateData.messagesLimit = targetPlan.messagesLimit;
        console.log(`🔄 Plan changed from ${existingSubscription.planId} to ${targetPlan.id} (${targetPlan.name}) for ${shopDomain}`);
        
        // Reset usage for plan upgrade
        updateData.messagesUsed = 0;
        updateData.currentPeriodStart = new Date();
        updateData.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        console.log(`🔄 Resetting usage counters for plan change`);
      }

      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: updateData
      });
      
      console.log(`✅ Updated subscription ${existingSubscription.id} for ${shopDomain} to plan ${targetPlan.name}`);
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
