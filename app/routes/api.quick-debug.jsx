import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    // Just get basic counts first
    const subscriptionCount = await prisma.subscription.count({
      where: { shopDomain: shop }
    });

    const activeSubscriptionCount = await prisma.subscription.count({
      where: { 
        shopDomain: shop,
        OR: [
          { status: 'active' },
          { status: 'ACTIVE' },
          { status: 'Active' }
        ]
      }
    });

    // Get shop basic info
    const shopExists = await prisma.shop.count({
      where: { shopDomain: shop }
    });

    const result = {
      shop: shop,
      shopExists: shopExists > 0,
      totalSubscriptions: subscriptionCount,
      activeSubscriptions: activeSubscriptionCount,
      timestamp: new Date().toISOString()
    };

    await prisma.$disconnect();
    return json(result);

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message,
      shop: shop || 'unknown'
    }, { status: 500 });
  }
}