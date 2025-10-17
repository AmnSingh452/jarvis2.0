import { json } from "@remix-run/node";
import { prisma } from "~/db.server";

/**
 * Debug endpoint to manually refresh subscription status
 */
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return json({ error: "Shop parameter required" }, { status: 400 });
    }

    // Get all subscriptions for this shop
    const allSubscriptions = await prisma.subscription.findMany({
      where: { shopDomain: shop },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    // Get shop data
    const shopData = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      include: { widgetSettings: true }
    });

    const now = new Date();
    const installedAt = shopData?.installedAt ? new Date(shopData.installedAt) : null;
    const trialDays = 14;
    const trialEndDate = installedAt ? new Date(installedAt.getTime() + (trialDays * 24 * 60 * 60 * 1000)) : null;
    const trialExpired = trialEndDate ? now > trialEndDate : true;

    return json({
      success: true,
      shop: shop,
      shopData: {
        id: shopData?.id,
        installedAt: shopData?.installedAt,
        trialEndDate: trialEndDate,
        trialExpired: trialExpired,
        daysLeft: trialEndDate ? Math.ceil((trialEndDate - now) / (24 * 60 * 60 * 1000)) : 0
      },
      subscriptions: allSubscriptions,
      activeSubscription: allSubscriptions.find(sub => 
        sub.status?.toLowerCase() === 'active'
      ),
      widgetSettings: shopData?.widgetSettings,
      debug: {
        totalSubscriptions: allSubscriptions.length,
        subscriptionStatuses: allSubscriptions.map(sub => ({
          id: sub.id,
          status: sub.status,
          planName: sub.plan?.name,
          createdAt: sub.createdAt
        }))
      }
    });

  } catch (error) {
    console.error("Debug subscription error:", error);
    return json({ 
      error: "Debug failed", 
      details: error.message 
    }, { status: 500 });
  }
}