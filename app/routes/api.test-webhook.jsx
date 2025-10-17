import { json } from "@remix-run/node";

export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    const shop = formData.get("shop");
    
    if (action === "simulate_webhook" && shop) {
      // First, delete any existing subscription for this test
      await prisma.subscription.deleteMany({
        where: { 
          shopDomain: shop,
          shopifySubscriptionId: "test-simulation-123"
        }
      });

      // Simulate webhook payload for subscription creation
      const mockWebhookPayload = {
        app_subscription: {
          id: "test-simulation-123",
          status: "active",
          name: "Essential Plan Test",
          price: "14.99",
          billing_cycle: "monthly"
        }
      };

      // Call the webhook handler logic manually
      const subscription = mockWebhookPayload.app_subscription;
      const subscriptionId = subscription.id.toString();

      // Check if subscription already exists
      let existingSubscription = await prisma.subscription.findFirst({
        where: { 
          shopDomain: shop,
          shopifySubscriptionId: subscriptionId
        }
      });

      if (!existingSubscription) {
        // Get the first available plan
        const plan = await prisma.plan.findFirst({
          where: { isActive: true },
          orderBy: { price: 'asc' }
        });

        if (!plan) {
          await prisma.$disconnect();
          return json({ 
            error: "No plans available",
            success: false
          }, { status: 400 });
        }

        // Create new subscription (simulating the webhook logic)
        const newSubscription = await prisma.subscription.create({
          data: {
            shopDomain: shop,
            planId: plan.id,
            status: subscription.status.toUpperCase(),
            shopifySubscriptionId: subscriptionId,
            billingCycle: 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            messagesUsed: 0,
            messagesLimit: plan.messagesLimit,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        await prisma.$disconnect();

        return json({
          success: true,
          message: "✅ Webhook simulation successful - subscription created automatically",
          simulation: {
            action: "CREATE",
            subscriptionId: newSubscription.id,
            shopDomain: shop,
            planName: plan.name,
            status: newSubscription.status
          },
          webhookPayload: mockWebhookPayload
        });
      } else {
        await prisma.$disconnect();
        return json({
          success: true,
          message: "⚠️ Subscription already exists - would update in real webhook",
          simulation: {
            action: "UPDATE",
            existingSubscriptionId: existingSubscription.id,
            shopDomain: shop
          }
        });
      }
    }

    if (action === "cleanup_test" && shop) {
      // Clean up test subscriptions
      const deletedCount = await prisma.subscription.deleteMany({
        where: { 
          shopDomain: shop,
          shopifySubscriptionId: "test-simulation-123"
        }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: `Cleaned up ${deletedCount.count} test subscriptions`,
        deletedCount: deletedCount.count
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ 
    message: "POST with action=simulate_webhook&shop=domain to test automatic subscription creation",
    actions: ["simulate_webhook", "cleanup_test"]
  });
}