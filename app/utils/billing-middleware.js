import { checkSubscriptionStatus, incrementMessageUsage } from "../utils/billing.js";
import { json } from "@remix-run/node";

export async function withBillingCheck(shopDomain, processChatFunction, request) {
  try {
    // Check subscription status
    const billingCheck = await checkSubscriptionStatus(shopDomain);
    
    if (!billingCheck.hasAccess) {
      const errorMessages = {
        'NO_SUBSCRIPTION': 'Please subscribe to a plan to use Jarvis AI features.',
        'INACTIVE_SUBSCRIPTION': 'Your subscription is inactive. Please update your billing.',
        'EXPIRED_SUBSCRIPTION': 'Your subscription has expired. Please renew to continue.',
        'LIMIT_EXCEEDED': 'You have reached your monthly message limit. Please upgrade your plan.'
      };
      
      return json({
        error: "Subscription required",
        message: errorMessages[billingCheck.reason] || "Billing issue detected",
        reason: billingCheck.reason,
        redirectTo: "/app/billing"
      }, { status: 402 });
    }
    
    // Process the chat message
    const response = await processChatFunction(request);
    
    // Increment usage counter (only if chat was successful)
    if (response.status !== 'error') {
      await incrementMessageUsage(shopDomain);
    }
    
    // Add remaining messages info to response
    if (response.data) {
      response.data.remainingMessages = billingCheck.remainingMessages - 1;
      response.data.subscription = {
        plan: billingCheck.subscription.plan.name,
        usage: `${billingCheck.subscription.messagesUsed + 1}/${billingCheck.subscription.messagesLimit}`
      };
    }
    
    return response;
  } catch (error) {
    console.error('Billing check error:', error);
    return json({
      error: "Billing system error",
      message: "Please try again or contact support if the issue persists."
    }, { status: 500 });
  }
}

// Utility function to check if shop has billing access
export async function hasBillingAccess(shopDomain) {
  try {
    const billingCheck = await checkSubscriptionStatus(shopDomain);
    return billingCheck.hasAccess;
  } catch (error) {
    console.error('Error checking billing access:', error);
    return false;
  }
}

// Utility function to get subscription info for display
export async function getSubscriptionInfo(shopDomain) {
  try {
    const billingCheck = await checkSubscriptionStatus(shopDomain);
    
    if (billingCheck.hasAccess) {
      return {
        hasAccess: true,
        plan: billingCheck.subscription.plan.name,
        usage: `${billingCheck.subscription.messagesUsed}/${billingCheck.subscription.messagesLimit}`,
        remainingMessages: billingCheck.remainingMessages,
        status: billingCheck.subscription.status
      };
    }
    
    return {
      hasAccess: false,
      reason: billingCheck.reason
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return { hasAccess: false, reason: 'ERROR' };
  }
}
