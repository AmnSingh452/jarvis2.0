import prisma from "../db.server.js";

export async function checkSubscriptionStatus(shopDomain) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain },
      include: { plan: true }
    });
    
    if (!subscription) {
      return { hasAccess: false, reason: 'NO_SUBSCRIPTION' };
    }
    
    if (subscription.status !== 'ACTIVE') {
      return { hasAccess: false, reason: 'INACTIVE_SUBSCRIPTION' };
    }
    
    if (new Date() > subscription.currentPeriodEnd) {
      return { hasAccess: false, reason: 'EXPIRED_SUBSCRIPTION' };
    }
    
    if (subscription.messagesUsed >= subscription.messagesLimit) {
      return { hasAccess: false, reason: 'LIMIT_EXCEEDED' };
    }
    
    return { 
      hasAccess: true, 
      subscription,
      remainingMessages: subscription.messagesLimit - subscription.messagesUsed
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { hasAccess: false, reason: 'ERROR', error: error.message };
  }
}

export async function incrementMessageUsage(shopDomain) {
  try {
    await prisma.subscription.update({
      where: { shopDomain },
      data: {
        messagesUsed: {
          increment: 1
        }
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error incrementing message usage:', error);
    return { success: false, error: error.message };
  }
}

export async function createDefaultPlans() {
  const plans = [
    {
      name: "Free Trial",
      price: 0,
      billingCycle: "MONTHLY",
      messagesLimit: 100,
      features: ["100 messages/month", "Basic customization", "Email support"]
    },
    {
      name: "Starter",
      price: 9.99,
      billingCycle: "MONTHLY",
      messagesLimit: 1000,
      features: ["1,000 messages/month", "Basic customization", "Email support"]
    },
    {
      name: "Professional",
      price: 29.99,
      billingCycle: "MONTHLY", 
      messagesLimit: 5000,
      features: ["5,000 messages/month", "Advanced customization", "Priority support", "Analytics dashboard"]
    },
    {
      name: "Enterprise",
      price: 99.99,
      billingCycle: "MONTHLY",
      messagesLimit: 25000,
      features: ["25,000 messages/month", "Full customization", "24/7 support", "Advanced analytics", "Custom integrations"]
    }
  ];
  
  try {
    console.log('Creating default billing plans...');
    
    for (const plan of plans) {
      await prisma.plan.upsert({
        where: { name: plan.name },
        update: plan,
        create: plan
      });
      console.log(`✅ Plan "${plan.name}" created/updated`);
    }
    
    console.log('✅ All billing plans created successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error creating default plans:', error);
    return { success: false, error: error.message };
  }
}

export async function createTrialSubscription(shopDomain) {
  try {
    // Find the free trial plan
    const trialPlan = await prisma.plan.findUnique({
      where: { name: "Free Trial" }
    });
    
    if (!trialPlan) {
      throw new Error('Free trial plan not found');
    }
    
    // Create trial subscription
    const subscription = await prisma.subscription.create({
      data: {
        shopDomain,
        planId: trialPlan.id,
        status: 'TRIAL',
        billingCycle: trialPlan.billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        messagesLimit: trialPlan.messagesLimit,
        messagesUsed: 0
      },
      include: { plan: true }
    });
    
    console.log(`✅ Trial subscription created for ${shopDomain}`);
    return { success: true, subscription };
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    return { success: false, error: error.message };
  }
}

export async function getSubscriptionAnalytics(shopDomain) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain },
      include: { plan: true, payments: true }
    });
    
    if (!subscription) {
      return { hasData: false };
    }
    
    const usagePercentage = (subscription.messagesUsed / subscription.messagesLimit) * 100;
    const remainingDays = Math.ceil((subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
    
    return {
      hasData: true,
      subscription,
      analytics: {
        usagePercentage,
        remainingDays,
        totalPayments: subscription.payments.length,
        isNearLimit: usagePercentage > 80,
        isExpiringSoon: remainingDays <= 7
      }
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    return { hasData: false, error: error.message };
  }
}
