import { json } from "@remix-run/node";

export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    const shop = formData.get("shop");
    
    if (action === "delete_manual_subscription" && shop) {
      // Delete the manually created subscription so we can test automatic creation
      const deletedCount = await prisma.subscription.deleteMany({
        where: { 
          shopDomain: shop,
          shopifySubscriptionId: null // Only delete manual ones without Shopify ID
        }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: `Deleted ${deletedCount.count} manual subscription records for ${shop}`,
        deletedCount: deletedCount.count
      });
    }

    if (action === "test_webhook") {
      // Simulate a webhook payload to test the new logic
      const testPayload = {
        app_subscription: {
          id: "test-subscription-123",
          status: "active",
          name: "Essential Plan",
          price: "14.99"
        }
      };

      // Import and call the webhook handler (we'll need to expose this)
      return json({
        success: true,
        message: "Test webhook functionality",
        payload: testPayload
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
    message: "POST with action=delete_manual_subscription&shop=domain to clean up manual subscriptions"
  });
}