import { json } from "@remix-run/node";

export async function action({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  
  if (!shopDomain) {
    return json({ error: "Shop parameter required" }, { status: 400 });
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

    return json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error("Error saving widget settings:", error);
    return json({ error: "Failed to save settings" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  
  if (!shopDomain) {
    return json({ error: "Shop parameter required" }, { status: 400 });
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
        buttonIcon: "💬",
        windowWidth: "320px",
        windowHeight: "420px",
        headerText: "Jarvis AI Chatbot",
        placeholderText: "Type your message...",
        welcomeMessage: "Hello! How can I assist you today?",
        showTypingIndicator: true,
        enableSounds: false,
        autoOpen: false,
        customCSS: "",
        isEnabled: true
      };
    }
    
    return json({ settings });
  } catch (error) {
    console.error("Error fetching widget settings:", error);
    return json({ error: "Failed to fetch settings" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
