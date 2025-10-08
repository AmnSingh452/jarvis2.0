import { json } from "@remix-run/node";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

// Handle OPTIONS preflight requests
export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

// Conversation limit checking function
async function checkConversationLimit(shopDomain, prisma) {
  try {
    // Get current month's start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get shop installation info to check trial period
    const shop = await prisma.shop.findUnique({
      where: { shopDomain }
    });

    if (!shop) {
      return { 
        allowed: false, 
        reason: "Shop not found",
        used: 0,
        limit: 0,
        remaining: 0,
        planName: "No Plan",
        usagePercentage: 0,
        isTrial: false,
        trialExpired: false
      };
    }

    // Calculate trial period (14 days from installation)
    const trialEndDate = new Date(shop.installedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    const isInTrialPeriod = now <= trialEndDate;
    const trialExpired = now > trialEndDate;

    // Get shop's active subscription plan
    const subscription = await prisma.subscription.findFirst({
      where: { 
        shopDomain, 
        status: 'active' 
      },
      include: { 
        plan: true 
      }
    });

    // If no subscription and trial expired, block access
    if (!subscription && trialExpired) {
      return { 
        allowed: false, 
        reason: "Trial period expired, subscription required",
        used: 0,
        limit: 0,
        remaining: 0,
        planName: "Trial Expired",
        usagePercentage: 0,
        isTrial: false,
        trialExpired: true,
        trialEndDate: trialEndDate.toISOString(),
        daysInTrial: Math.floor((now - shop.installedAt) / (1000 * 60 * 60 * 24))
      };
    }

    // If no subscription but still in trial, allow unlimited access during trial
    if (!subscription && isInTrialPeriod) {
      // During trial, count conversations from trial start (installation date), not month start
      const trialConversations = await prisma.chatConversation.count({
        where: {
          shopDomain,
          startTime: { gte: shop.installedAt }
        }
      });

      const trialDaysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

      return { 
        allowed: true, 
        reason: "Free trial period",
        used: trialConversations,
        limit: "Unlimited (Trial)",
        remaining: "Unlimited",
        planName: "14-Day Free Trial",
        usagePercentage: 0,
        isTrial: true,
        trialExpired: false,
        trialEndDate: trialEndDate.toISOString(),
        trialDaysRemaining: trialDaysRemaining,
        daysInTrial: Math.floor((now - shop.installedAt) / (1000 * 60 * 60 * 24))
      };
    }

    // If we have an active subscription, check plan limits
    if (subscription) {
      // Count conversations this month
      const monthlyConversations = await prisma.chatConversation.count({
        where: {
          shopDomain,
          startTime: { 
            gte: monthStart 
          }
        }
      });

      // Define plan limits based on your requirements
      const planLimits = {
        'essential': 1000,      // Essential plan: 1,000 conversations/month
        'sales_pro': -1,        // Sales Pro plan: Unlimited
        'pro': -1,              // Alternative name for Sales Pro
        'sales pro': -1         // Handle space in name
      };

      const planName = subscription.plan.name.toLowerCase();
      const limit = planLimits[planName] || 1000; // Default to Essential limits if plan not found
      const isUnlimited = limit === -1;
      
      return {
        allowed: isUnlimited || monthlyConversations < limit,
        used: monthlyConversations,
        limit: isUnlimited ? "Unlimited" : limit,
        remaining: isUnlimited ? "Unlimited" : Math.max(0, limit - monthlyConversations),
        planName: subscription.plan.name,
        monthStart: monthStart.toISOString(),
        usagePercentage: isUnlimited ? 0 : ((monthlyConversations / limit) * 100).toFixed(1),
        isUnlimited: isUnlimited,
        isTrial: false,
        trialExpired: false
      };
    }

    // Fallback case
    return { 
      allowed: false, 
      reason: "No valid subscription or trial",
      used: 0,
      limit: 0,
      remaining: 0,
      planName: "Unknown",
      usagePercentage: 0,
      isTrial: false,
      trialExpired: false
    };

  } catch (error) {
    console.error("Error checking conversation limit:", error);
    return { 
      allowed: true, // Allow by default if there's an error
      used: 0,
      limit: "Unknown",
      remaining: "Unknown",
      planName: "Unknown",
      error: error.message,
      usagePercentage: 0,
      isUnlimited: false,
      isTrial: false,
      trialExpired: false
    };
  }
}

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");

    if (!shopDomain) {
      return json({ error: "Shop parameter required" }, { status: 400, headers: corsHeaders });
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const limitInfo = await checkConversationLimit(shopDomain, prisma);

    await prisma.$disconnect();

    return json(limitInfo, { headers: corsHeaders });

  } catch (error) {
    console.error("Conversation limit check error:", error);
    return json({ 
      error: "Failed to check conversation limit",
      allowed: true // Allow by default on error
    }, { status: 500, headers: corsHeaders });
  }
}

// POST endpoint for checking limits before creating conversations
export async function action({ request }) {
  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");

    if (!shopDomain) {
      return json({ error: "Shop parameter required" }, { status: 400, headers: corsHeaders });
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const limitInfo = await checkConversationLimit(shopDomain, prisma);

    await prisma.$disconnect();

    // Return 429 status if limit exceeded
    if (!limitInfo.allowed) {
      return json({
        ...limitInfo,
        message: `Monthly conversation limit reached. You've used ${limitInfo.used} of ${limitInfo.limit} conversations.`
      }, { 
        status: 429, // Too Many Requests
        headers: corsHeaders 
      });
    }

    return json(limitInfo, { headers: corsHeaders });

  } catch (error) {
    console.error("Conversation limit check error:", error);
    return json({ 
      error: "Failed to check conversation limit",
      allowed: true // Allow by default on error
    }, { status: 500, headers: corsHeaders });
  }
}