import { json } from "@remix-run/node";

export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    const shop = formData.get("shop");
    const planName = formData.get("planName");
    
    if (action === "update_to_sales_pro" && shop) {
      // Find Sales Pro plan
      const salesProPlan = await prisma.plan.findFirst({
        where: { 
          name: { contains: 'Sales Pro', mode: 'insensitive' }
        }
      });

      if (!salesProPlan) {
        await prisma.$disconnect();
        return json({ 
          error: "Sales Pro plan not found",
          success: false
        }, { status: 400 });
      }

      // Find existing subscription for the shop
      const existingSubscription = await prisma.subscription.findFirst({
        where: { shopDomain: shop },
        include: { plan: true }
      });

      if (!existingSubscription) {
        await prisma.$disconnect();
        return json({ 
          error: "No subscription found for shop",
          success: false
        }, { status: 400 });
      }

      // Update subscription to Sales Pro
      const updatedSubscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: salesProPlan.id,
          messagesLimit: salesProPlan.messagesLimit,
          messagesUsed: 0, // Reset usage for upgrade
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        include: { plan: true }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: `Successfully upgraded ${shop} to Sales Pro plan`,
        oldPlan: existingSubscription.plan.name,
        newPlan: updatedSubscription.plan.name,
        subscription: {
          id: updatedSubscription.id,
          shopDomain: updatedSubscription.shopDomain,
          planName: updatedSubscription.plan.name,
          messagesLimit: updatedSubscription.messagesLimit,
          status: updatedSubscription.status
        }
      });
    }

    if (action === "check_current_plan" && shop) {
      const subscription = await prisma.subscription.findFirst({
        where: { shopDomain: shop },
        include: { plan: true }
      });

      await prisma.$disconnect();

      return json({
        shop: shop,
        subscription: subscription ? {
          planName: subscription.plan.name,
          price: subscription.plan.price,
          messagesLimit: subscription.messagesLimit,
          messagesUsed: subscription.messagesUsed,
          status: subscription.status
        } : null
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
    message: "POST with action=update_to_sales_pro&shop=domain to upgrade plan manually",
    actions: ["update_to_sales_pro", "check_current_plan"]
  });
}