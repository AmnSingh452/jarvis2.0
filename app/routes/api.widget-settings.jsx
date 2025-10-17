import { json } from "@remix-run/node";

// Utility to add CORS headers to all responses
function withCORS(response, status = 200) {
  return new Response(response.body, {
    status: response.status || status,
    headers: {
      ...Object.fromEntries(response.headers),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }
  });
}

export async function action({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return withCORS(json({ error: "Shop parameter required" }, { status: 400 }));
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const formData = await request.formData();
    const settings = JSON.parse(formData.get("settings"));

    const updatedSettings = await prisma.widgetSettings.upsert({
      where: { shopDomain },
      update: settings,
      create: {
        shopDomain,
        ...settings
      }
    });

    return withCORS(json({ success: true, settings: updatedSettings }));
  } catch (error) {
    console.error("Error saving widget settings:", error);
    return withCORS(json({ error: "Failed to save settings" }, { status: 500 }));
  } finally {
    await prisma.$disconnect();
  }
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return withCORS(json({ error: "Shop parameter required" }, { status: 400 }));
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Check trial status and subscription first
    let isWidgetAllowed = true;
    let trialStatus = null;
    
    try {
      // Get shop installation info to check trial period
      const shop = await prisma.shop.findUnique({
        where: { shopDomain }
      });

      if (shop) {
        // Calculate trial period (14 days from installation)
        const now = new Date();
        const trialEndDate = new Date(shop.installedAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        const trialExpired = now > trialEndDate;

        // Check for active subscription (handle different case variations)
        const subscription = await prisma.subscription.findFirst({
          where: { 
            shopDomain, 
            OR: [
              { status: 'active' },
              { status: 'ACTIVE' },
              { status: 'Active' }
            ]
          }
        });

        // If trial expired and no active subscription, disable widget
        if (trialExpired && !subscription) {
          isWidgetAllowed = false;
          trialStatus = {
            expired: true,
            message: "Trial period has ended. Please subscribe to continue using the chatbot."
          };
          console.log("🚫 Widget disabled due to expired trial for shop:", shopDomain);
        } else if (trialExpired && subscription) {
          console.log("✅ Widget enabled for shop with active subscription:", shopDomain);
        } else {
          const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`⏰ Widget enabled for shop in trial period (${daysRemaining} days remaining):`, shopDomain);
        }
      }
    } catch (trialError) {
      console.warn("⚠️ Could not check trial status, allowing widget:", trialError instanceof Error ? trialError.message : trialError);
      // If we can't check trial status, allow widget to work (fail-open)
    }

    let settings = await prisma.widgetSettings.findUnique({
      where: { shopDomain }
    });

    // If no settings exist, return defaults
    if (!settings) {
      settings = {
        primaryColor: "#007bff",
        secondaryColor: "#0056b3",
        buttonSize: "60px",
        position: "bottom-right",
        buttonIcon: "\uD83D\uDCAC",
        windowWidth: "320px",
        windowHeight: "420px",
        headerText: "Jarvis AI Chatbot",
        placeholderText: "Type your message...",
        welcomeMessage: "Hello! How can I assist you today?",
        showTypingIndicator: true,
        enableSounds: false,
        autoOpen: false,
        customCSS: "",
        isEnabled: isWidgetAllowed, // Apply trial validation to default settings too
        cartAbandonmentEnabled: false,
        cartAbandonmentDiscount: 10,
        cartAbandonmentDelay: 300
      };
    } else {
      // Apply trial validation - disable widget if trial expired and no subscription
      settings.isEnabled = settings.isEnabled && isWidgetAllowed;
    }

    return withCORS(json({ 
      settings,
      trialStatus: trialStatus 
    }));
  } catch (error) {
    console.error("Error fetching widget settings:", error);
    return withCORS(json({ error: "Failed to fetch settings" }, { status: 500 }));
  } finally {
    await prisma.$disconnect();
  }
}
