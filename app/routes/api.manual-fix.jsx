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
      // First check if there are any plans in the database
      const plans = await prisma.plan.findMany();
      
      if (plans.length === 0) {
        await prisma.$disconnect();
        return json({ 
          error: "No plans found in database. Create plans first." 
        }, { status: 400 });
      }

      // Use the first available plan (likely Essential)
      const plan = plans[0];

      // Create a manual subscription record for the shop
      const subscription = await prisma.subscription.create({
        data: {
          shopDomain: shop,
          status: 'ACTIVE',
          planId: plan.id, // Use the actual plan ID
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          messagesUsed: 0,
          messagesLimit: plan.messagesLimit,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await prisma.$disconnect();

      return json({ 
        success: true, 
        message: "Subscription created manually",
        subscription: subscription,
        plan: plan
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