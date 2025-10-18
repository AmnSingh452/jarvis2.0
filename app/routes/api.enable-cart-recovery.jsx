import { json } from "@remix-run/node";

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

    if (action === "enable_cart_abandonment") {
      // Update widget settings to enable cart abandonment
      const updatedSettings = await prisma.widgetSettings.upsert({
        where: { shopDomain: shop },
        update: {
          cartAbandonmentEnabled: true,
          updatedAt: new Date()
        },
        create: {
          shopDomain: shop,
          primaryColor: "#007bff",
          secondaryColor: "#0056b3", 
          buttonSize: "60px",
          position: "bottom-right",
          buttonIcon: "💬",
          welcomeMessage: "Hello! How can I help you today?",
          customCSS: "",
          isEnabled: true,
          cartAbandonmentEnabled: true,
          cartAbandonmentDiscount: 10,
          cartAbandonmentDelay: 300
        }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: "Cart abandonment recovery enabled",
        settings: {
          cartAbandonmentEnabled: updatedSettings.cartAbandonmentEnabled,
          cartAbandonmentDiscount: updatedSettings.cartAbandonmentDiscount,
          cartAbandonmentDelay: updatedSettings.cartAbandonmentDelay
        }
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
    message: "POST with action=enable_cart_abandonment&shop=domain to enable cart recovery"
  });
}