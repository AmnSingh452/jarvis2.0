import { json } from "@remix-run/node";

/**
 * Manual fix endpoint to create subscription record
 * USE ONLY FOR DEBUGGING - REMOVE IN PRODUCTION
 */
export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const shop = formData.get("shop");
    const action = formData.get("action");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    if (action === "create_subscription") {
      // Create a manual subscription record for the shop
      const subscription = await prisma.subscription.create({
        data: {
          shopDomain: shop,
          status: 'ACTIVE',
          shopifySubscriptionId: 'manual-fix-' + Date.now(),
          planId: 1, // Assuming Essential plan
          messagesUsed: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await prisma.$disconnect();

      return json({ 
        success: true, 
        message: "Subscription created manually",
        subscription: subscription
      });
    }

    if (action === "check_shop") {
      // Just check if shop exists
      const shop_record = await prisma.shop.findUnique({
        where: { shopDomain: shop }
      });

      const subscriptions = await prisma.subscription.findMany({
        where: { shopDomain: shop }
      });

      await prisma.$disconnect();

      return json({
        shopExists: !!shop_record,
        shop: shop_record,
        subscriptions: subscriptions
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ 
    message: "POST to this endpoint with shop and action parameters",
    actions: ["create_subscription", "check_shop"]
  });
}