import { json } from "@remix-run/node";
import prisma from "../db.server.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return json({ error: "Shop parameter is required" }, { status: 400 });
  }

  try {
    // Get shop installation info
    const shop = await prisma.shop.findUnique({
      where: { shopDomain }
    });

    // Get all subscriptions for this shop
    const subscriptions = await prisma.subscription.findMany({
      where: { shopDomain },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate trial info
    const now = new Date();
    const trialEndDate = shop ? new Date(shop.installedAt) : new Date();
    if (shop) {
      trialEndDate.setDate(trialEndDate.getDate() + 14);
    }
    const trialExpired = now > trialEndDate;
    const daysInTrial = shop ? Math.floor((now - shop.installedAt) / (1000 * 60 * 60 * 24)) : 0;
    const daysRemaining = shop ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0;

    // Check for active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: { 
        shopDomain, 
        status: 'active' 
      }
    });

    // Check with different status cases
    const activeSubscriptionUppercase = await prisma.subscription.findFirst({
      where: { 
        shopDomain, 
        status: 'ACTIVE' 
      }
    });

    // Get widget settings
    const widgetSettings = await prisma.widgetSettings.findUnique({
      where: { shopDomain }
    });

    return json({
      shopDomain,
      shopInfo: {
        installedAt: shop?.installedAt,
        trialEndDate: trialEndDate.toISOString(),
        trialExpired,
        daysInTrial,
        daysRemaining
      },
      subscriptions: {
        total: subscriptions.length,
        allSubscriptions: subscriptions.map(sub => ({
          id: sub.id,
          shopifySubscriptionId: sub.shopifySubscriptionId,
          status: sub.status,
          planName: sub.planName,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt
        })),
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
          planName: activeSubscription.planName,
          createdAt: activeSubscription.createdAt
        } : null,
        activeSubscriptionUppercase: activeSubscriptionUppercase ? {
          id: activeSubscriptionUppercase.id,
          status: activeSubscriptionUppercase.status,
          planName: activeSubscriptionUppercase.planName,
          createdAt: activeSubscriptionUppercase.createdAt
        } : null
      },
      widgetSettings: {
        exists: !!widgetSettings,
        isEnabled: widgetSettings?.isEnabled,
        lastUpdated: widgetSettings?.updatedAt
      },
      debug: {
        shouldWidgetWork: !trialExpired || !!activeSubscription || !!activeSubscriptionUppercase,
        reasons: {
          trialValid: !trialExpired,
          hasActiveSubscription: !!activeSubscription,
          hasActiveSubscriptionUppercase: !!activeSubscriptionUppercase
        }
      }
    });

  } catch (error) {
    console.error("Debug subscription error:", error);
    return json({ error: "Failed to debug subscription status", details: error.message }, { status: 500 });
  }
}