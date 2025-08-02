// Test Billing System - Simulates Shopify billing for development
import { PrismaClient } from "@prisma/client";

export const TEST_PLANS = {
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

export const TEST_CREDIT_CARDS = {
  VISA: "4111 1111 1111 1111",
  MASTERCARD: "5555 5555 5555 4444", 
  AMEX: "3782 822463 10005",
  DISCOVER: "6011 1111 1111 1117",
  EXPIRY: "12/25",
  CVV: "123"
};

// Simulate subscription creation
export async function createTestSubscription(shopDomain, planKey) {
  const plan = TEST_PLANS[planKey];
  
  if (!plan) {
    return { success: false, error: "Invalid plan selected" };
  }
  
  console.log("🧪 TEST BILLING MODE ACTIVE");
  console.log(`✅ Simulating subscription for ${shopDomain}`);
  console.log(`✅ Plan: ${plan.name} ($${plan.price}/month)`);
  console.log("✅ No real charges will be made");
  
  try {
    const prisma = new PrismaClient();
    
    // Generate a test subscription ID
    const testSubscriptionId = `test_sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Calculate billing period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);
    
    // First, ensure we have a plan record in the database
    const planRecord = await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: {
        name: plan.name,
        price: plan.price,
        billingCycle: "MONTHLY",
        messagesLimit: plan.messagesLimit,
        features: plan.features,
        isActive: true
      }
    });
    
    // Save to database
    const subscription = await prisma.subscription.upsert({
      where: { shopDomain },
      update: {
        planId: planRecord.id,
        shopifyChargeId: testSubscriptionId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart,
        currentPeriodEnd,
        messagesLimit: plan.messagesLimit,
        messagesUsed: 0,
        trialEndsAt,
        updatedAt: new Date()
      },
      create: {
        shopDomain,
        planId: planRecord.id,
        shopifyChargeId: testSubscriptionId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart,
        currentPeriodEnd,
        messagesLimit: plan.messagesLimit,
        messagesUsed: 0,
        trialEndsAt
      },
      include: {
        plan: true
      }
    });
    
    await prisma.$disconnect();
    
    console.log(`✅ Test subscription created: ${testSubscriptionId}`);
    
    return {
      success: true,
      subscription: {
        id: testSubscriptionId,
        planName: subscription.plan.name,
        status: 'ACTIVE',
        price: subscription.plan.price,
        trialDays: plan.trialDays,
        nextBillingDate: currentPeriodEnd.toISOString(),
        createdAt: new Date().toISOString()
      },
      message: `Successfully subscribed to ${subscription.plan.name} plan! (Test Mode)`
    };
  } catch (error) {
    console.error("Test billing error:", error);
    return { success: false, error: error.message };
  }
}

// Check for active test subscription
export async function checkTestSubscription(shopDomain) {
  try {
    const prisma = new PrismaClient();
    
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain },
      include: {
        plan: true
      }
    });
    
    await prisma.$disconnect();
    
    if (subscription) {
      return {
        hasActiveSubscription: subscription.status === 'ACTIVE',
        subscription: {
          id: subscription.shopifyChargeId,
          planName: subscription.plan.name,
          status: subscription.status,
          price: subscription.plan.price,
          trialDays: 0, // Trial would be calculated based on trialEndsAt
          nextBillingDate: subscription.currentPeriodEnd?.toISOString(),
          createdAt: subscription.createdAt.toISOString()
        }
      };
    }
    
    return { hasActiveSubscription: false, subscription: null };
  } catch (error) {
    console.error("Test subscription check error:", error);
    return { hasActiveSubscription: false, subscription: null };
  }
}

// Cancel test subscription
export async function cancelTestSubscription(shopDomain) {
  try {
    const prisma = new PrismaClient();
    
    await prisma.subscription.update({
      where: { shopDomain },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });
    
    await prisma.$disconnect();
    
    console.log(`✅ Test subscription cancelled for ${shopDomain}`);
    
    return {
      success: true,
      message: "Subscription cancelled successfully (Test Mode)"
    };
  } catch (error) {
    console.error("Test cancellation error:", error);
    return { success: false, error: error.message };
  }
}

// Generate test analytics
export async function getTestAnalytics(shopDomain) {
  try {
    const prisma = new PrismaClient();
    
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain }
    });
    
    await prisma.$disconnect();
    
    if (!subscription) {
      return null;
    }
    
    // Generate some test analytics data
    const currentUsage = Math.floor(Math.random() * (subscription.messagesLimit / 2));
    
    return {
      totalUsage: currentUsage + Math.floor(Math.random() * 500),
      currentPeriodUsage: currentUsage,
      usageLimit: subscription.messagesLimit,
      billingCycleStart: subscription.currentPeriodStart?.toISOString(),
      nextBillingDate: subscription.currentPeriodEnd?.toISOString(),
      remainingMessages: subscription.messagesLimit - currentUsage
    };
  } catch (error) {
    console.error("Test analytics error:", error);
    return null;
  }
}
