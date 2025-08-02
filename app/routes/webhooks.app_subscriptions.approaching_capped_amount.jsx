import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

export async function action({ request }) {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);
    
    console.log(`Received webhook: ${topic} for shop: ${shop}`);
    
    await handleApproachingLimit(shop, payload);
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Approaching limit webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

async function handleApproachingLimit(shopDomain, payload) {
  const prisma = new PrismaClient();
  
  try {
    console.log(`Approaching usage limit for ${shopDomain}:`, payload);
    
    const subscription = await prisma.subscription.findUnique({
      where: { shopDomain }
    });
    
    if (subscription) {
      const usagePercentage = (subscription.messagesUsed / subscription.messagesLimit) * 100;
      console.log(`Current usage: ${subscription.messagesUsed}/${subscription.messagesLimit} (${usagePercentage.toFixed(1)}%)`);
      
      // Log the approaching limit event
      await prisma.subscription.update({
        where: { shopDomain },
        data: {
          updatedAt: new Date()
        }
      });
      
      // You could implement additional logic here:
      // - Send email notifications
      // - Trigger in-app notifications
      // - Suggest plan upgrades
      if (usagePercentage >= 90) {
        console.log(`URGENT: ${shopDomain} at ${usagePercentage.toFixed(1)}% usage - suggest immediate upgrade`);
      } else if (usagePercentage >= 80) {
        console.log(`WARNING: ${shopDomain} at ${usagePercentage.toFixed(1)}% usage - suggest upgrade soon`);
      }
    }
    
  } catch (error) {
    console.error("Approaching limit handler error:", error);
  } finally {
    await prisma.$disconnect();
  }
}
