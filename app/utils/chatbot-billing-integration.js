// Chatbot Billing Integration for Jarvis2.0
import { PrismaClient } from "@prisma/client";

export class ChatBotBillingIntegration {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // Check if shop has active subscription for chatbot usage
  async checkChatbotAccess(shopDomain) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { shopDomain },
        include: { plan: true }
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        return {
          hasAccess: false,
          reason: 'No active subscription',
          messagesRemaining: 0
        };
      }

      const messagesRemaining = subscription.messagesLimit - subscription.messagesUsed;
      
      return {
        hasAccess: messagesRemaining > 0,
        reason: messagesRemaining > 0 ? 'Active subscription' : 'Message limit reached',
        messagesRemaining,
        planName: subscription.plan.name,
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed
      };
    } catch (error) {
      console.error('Error checking chatbot access:', error);
      return {
        hasAccess: false,
        reason: 'Error checking subscription',
        messagesRemaining: 0
      };
    }
  }

  // Increment message usage when chatbot responds
  async incrementMessageUsage(shopDomain) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { shopDomain }
      });

      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Only increment if under limit
      if (subscription.messagesUsed < subscription.messagesLimit) {
        await this.prisma.subscription.update({
          where: { shopDomain },
          data: {
            messagesUsed: subscription.messagesUsed + 1,
            updatedAt: new Date()
          }
        });
        return true;
      }
      
      return false; // Message limit reached
    } catch (error) {
      console.error('Error incrementing message usage:', error);
      return false;
    }
  }

  // Get usage statistics for admin dashboard
  async getUsageStats(shopDomain) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { shopDomain },
        include: { plan: true }
      });

      if (!subscription) {
        return null;
      }

      const usagePercentage = (subscription.messagesUsed / subscription.messagesLimit) * 100;

      return {
        planName: subscription.plan.name,
        messagesUsed: subscription.messagesUsed,
        messagesLimit: subscription.messagesLimit,
        messagesRemaining: subscription.messagesLimit - subscription.messagesUsed,
        usagePercentage: Math.round(usagePercentage),
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  // Reset message usage at the start of new billing cycle
  async resetMessageUsage(shopDomain) {
    try {
      await this.prisma.subscription.update({
        where: { shopDomain },
        data: {
          messagesUsed: 0,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error resetting message usage:', error);
      return false;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Example usage in your chatbot route
export async function validateChatbotMessage(shopDomain) {
  const billing = new ChatBotBillingIntegration();
  
  try {
    const access = await billing.checkChatbotAccess(shopDomain);
    
    if (!access.hasAccess) {
      return {
        success: false,
        message: `Chatbot access limited: ${access.reason}`,
        data: access
      };
    }
    
    // Increment usage after successful message processing
    await billing.incrementMessageUsage(shopDomain);
    
    return {
      success: true,
      message: 'Message processed successfully',
      data: access
    };
  } finally {
    await billing.disconnect();
  }
}
