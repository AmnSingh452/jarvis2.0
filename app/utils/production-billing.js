// Production Billing System for Shopify App
import { PrismaClient } from "@prisma/client";

// Test credit card numbers for development testing
export const TEST_PAYMENT_METHODS = {
  VISA: "4111 1111 1111 1111",
  MASTERCARD: "5555 5555 5555 4444", 
  AMEX: "3782 822463 10005",
  DISCOVER: "6011 1111 1111 1117",
  
  // Test expiry and CVV
  EXPIRY: "12/25",
  CVV: "123",
  
  // Test billing address
  TEST_ADDRESS: {
    firstName: "Test",
    lastName: "Customer",
    address1: "123 Test Street", 
    city: "Test City",
    province: "ON",
    country: "CA",
    zip: "K1A 0A6"
  }
};

// Check if we're in test mode
export const isTestMode = () => process.env.NODE_ENV !== "production";

// Log test mode status
export const logTestModeStatus = () => {
  if (isTestMode()) {
    console.log("🧪 BILLING TEST MODE ACTIVE");
    console.log("✅ All charges are simulated");
    console.log("✅ No real money will be processed");
    console.log("✅ Use test credit cards:", TEST_PAYMENT_METHODS.VISA);
  } else {
    console.log("💰 BILLING LIVE MODE ACTIVE");
    console.log("⚠️ Real charges will be processed");
    console.log("⚠️ Real money will be collected");
  }
};

export const PRODUCTION_PLANS = {
  STARTER: {
    name: "Starter",
    price: 9.99,
    interval: "EVERY_30_DAYS",
    messagesLimit: 1000,
    trialDays: 14,
    features: [
      "1,000 messages/month",
      "Basic customization",
      "Email support",
      "Standard response time"
    ]
  },
  PROFESSIONAL: {
    name: "Professional", 
    price: 29.99,
    interval: "EVERY_30_DAYS",
    messagesLimit: 5000,
    trialDays: 14,
    features: [
      "5,000 messages/month",
      "Advanced customization",
      "Priority support",
      "Analytics dashboard",
      "Custom branding"
    ]
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 99.99,
    interval: "EVERY_30_DAYS",
    messagesLimit: 25000,
    trialDays: 14,
    features: [
      "25,000 messages/month",
      "Full customization",
      "24/7 support",
      "Advanced analytics",
      "Custom integrations",
      "White-label solution"
    ]
  }
};

export async function createShopifySubscription(session, billing, planKey) {
  const plan = PRODUCTION_PLANS[planKey];
  
  if (!plan) {
    return { success: false, error: "Invalid plan selected" };
  }
  
  try {
    // Log test mode status
    logTestModeStatus();
    console.log(`Creating subscription for plan: ${plan.name}, price: $${plan.price}`);
    
    const billingCheck = await billing.require({
      plans: [
        {
          plan: plan.name,
          price: plan.price,
          currencyCode: "USD",
          interval: plan.interval,
          trialDays: plan.trialDays
        }
      ],
      isTest: process.env.NODE_ENV !== "production",
      onFailure: async () => {
        throw new Error("Billing authorization required");
      }
    });
    
    if (billingCheck.appSubscriptions && billingCheck.appSubscriptions.length > 0) {
      // Save subscription to database
      const saveResult = await saveSubscriptionToDatabase(session.shop, billingCheck.appSubscriptions[0], planKey);
      
      return {
        success: true,
        subscription: billingCheck.appSubscriptions[0],
        confirmationUrl: billingCheck.confirmationUrl,
        saveResult
      };
    }
    
    return { success: false, error: "No subscription created" };
  } catch (error) {
    console.error("Billing error:", error);
    return { success: false, error: error.message };
  }
}

export async function checkActiveSubscription(session, billing) {
  try {
    const planNames = Object.values(PRODUCTION_PLANS).map(plan => plan.name);
    
    const subscriptions = await billing.check({
      plans: planNames,
      isTest: process.env.NODE_ENV !== "production"
    });
    
    return {
      hasActiveSubscription: subscriptions.hasActiveSubscription,
      subscription: subscriptions.appSubscriptions?.[0] || null
    };
  } catch (error) {
    console.error("Subscription check error:", error);
    return { hasActiveSubscription: false, subscription: null };
  }
}

export async function saveSubscriptionToDatabase(shopDomain, shopifySubscription, planKey) {
  const prisma = new PrismaClient();
  
  try {
    const planConfig = PRODUCTION_PLANS[planKey];
    
    if (!planConfig) {
      throw new Error(`Unknown plan key: ${planKey}`);
    }
    
    // Calculate billing period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    
    // Save to database
    await prisma.subscription.upsert({
      where: { shopDomain },
      update: {
        shopifySubscriptionId: shopifySubscription.id,
        planName: planConfig.name,
        status: 'ACTIVE',
        price: planConfig.price,
        currentPeriodStart,
        currentPeriodEnd,
        messagesLimit: planConfig.messagesLimit,
        messagesUsed: 0,
        trialEndsAt: shopifySubscription.trial_ends_on ? new Date(shopifySubscription.trial_ends_on) : null,
        updatedAt: new Date()
      },
      create: {
        shopDomain,
        shopifySubscriptionId: shopifySubscription.id,
        planName: planConfig.name,
        status: 'ACTIVE',
        price: planConfig.price,
        currentPeriodStart,
        currentPeriodEnd,
        messagesLimit: planConfig.messagesLimit,
        messagesUsed: 0,
        trialEndsAt: shopifySubscription.trial_ends_on ? new Date(shopifySubscription.trial_ends_on) : null
      }
    });
    
    console.log(`Subscription saved for ${shopDomain}: ${planConfig.name}`);
    return { success: true };
  } catch (error) {
    console.error("Database save error:", error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

export async function getSubscriptionAnalytics(shopDomain) {
  const prisma = new PrismaClient();
  
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain }
    });
    
    if (!subscription) {
      return { hasData: false };
    }
    
    // Calculate usage percentage
    const usagePercentage = subscription.messagesLimit > 0 
      ? Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100)
      : 0;
    
    // Calculate days remaining in billing cycle
    const now = new Date();
    const daysRemaining = Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24));
    
    // Check if trial is active
    const isTrialActive = subscription.trialEndsAt && subscription.trialEndsAt > now;
    const trialDaysRemaining = isTrialActive 
      ? Math.ceil((subscription.trialEndsAt - now) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      hasData: true,
      subscription,
      analytics: {
        usagePercentage,
        daysRemaining: Math.max(0, daysRemaining),
        isTrialActive,
        trialDaysRemaining: Math.max(0, trialDaysRemaining),
        messagesRemaining: Math.max(0, subscription.messagesLimit - subscription.messagesUsed)
      }
    };
  } catch (error) {
    console.error("Analytics error:", error);
    return { hasData: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

export async function incrementMessageUsage(shopDomain, increment = 1) {
  const prisma = new PrismaClient();
  
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain }
    });
    
    if (!subscription) {
      return { success: false, error: "No subscription found" };
    }
    
    // Check if usage would exceed limit
    const newUsage = subscription.messagesUsed + increment;
    if (newUsage > subscription.messagesLimit) {
      return { 
        success: false, 
        error: "Message limit exceeded",
        usageBlocked: true
      };
    }
    
    // Update usage
    await prisma.subscription.update({
      where: { shopDomain },
      data: {
        messagesUsed: newUsage,
        updatedAt: new Date()
      }
    });
    
    return { 
      success: true, 
      newUsage,
      remainingMessages: subscription.messagesLimit - newUsage
    };
  } catch (error) {
    console.error("Usage increment error:", error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

export async function cancelSubscription(session, billing) {
  try {
    // Get current subscription
    const subscriptionCheck = await checkActiveSubscription(session, billing);
    
    if (!subscriptionCheck.hasActiveSubscription) {
      return { success: false, error: "No active subscription found" };
    }
    
    // Cancel through Shopify
    const subscription = subscriptionCheck.subscription;
    await billing.cancel({
      subscriptionId: subscription.id,
      isTest: process.env.NODE_ENV !== "production"
    });
    
    // Update database
    const prisma = new PrismaClient();
    try {
      await prisma.subscription.update({
        where: { shopDomain: session.shop },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
    } finally {
      await prisma.$disconnect();
    }
    
    return { success: true };
  } catch (error) {
    console.error("Cancellation error:", error);
    return { success: false, error: error.message };
  }
}
