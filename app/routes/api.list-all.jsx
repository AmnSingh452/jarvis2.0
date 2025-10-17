import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    // Get all shops to see what domains exist
    const shops = await prisma.shop.findMany({
      select: {
        shopDomain: true,
        installedAt: true
      }
    });

    // Get all subscriptions to see what domains have subscriptions
    const subscriptions = await prisma.subscription.findMany({
      select: {
        shopDomain: true,
        status: true,
        shopifySubscriptionId: true,
        createdAt: true
      }
    });

    await prisma.$disconnect();

    return json({
      totalShops: shops.length,
      shops: shops,
      totalSubscriptions: subscriptions.length,
      subscriptions: subscriptions
    });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message
    }, { status: 500 });
  }
}