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
        isEnabled: true,
        cartAbandonmentEnabled: false,
        cartAbandonmentDiscount: 10,
        cartAbandonmentDelay: 300
      };
    } else {
      // Force enable for testing
      settings.isEnabled = true;
    }

    return withCORS(json({ settings }));
  } catch (error) {
    console.error("Error fetching widget settings:", error);
    return withCORS(json({ error: "Failed to fetch settings" }, { status: 500 }));
  } finally {
    await prisma.$disconnect();
  }
}
