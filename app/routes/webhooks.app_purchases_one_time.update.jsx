import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

export async function action({ request }) {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);
    
    console.log(`Received webhook: ${topic} for shop: ${shop}`);
    
    await handleOneTimePurchaseUpdate(shop, payload);
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("One-time purchase webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

async function handleOneTimePurchaseUpdate(shopDomain, payload) {
  const prisma = new PrismaClient();
  
  try {
    const purchase = payload.app_purchase_one_time;
    
    console.log(`One-time purchase update for ${shopDomain}:`, {
      id: purchase.id,
      status: purchase.status,
      name: purchase.name,
      price: purchase.price
    });
    
    // Save one-time purchase to database
    // You might want to create a separate table for one-time purchases
    await prisma.payment.create({
      data: {
        shopDomain,
        shopifyPurchaseId: purchase.id.toString(),
        type: 'ONE_TIME',
        amount: parseFloat(purchase.price),
        status: purchase.status.toUpperCase(),
        description: purchase.name,
        createdAt: new Date(purchase.created_at),
        updatedAt: new Date()
      }
    });
    
    // Handle different purchase statuses
    if (purchase.status === 'accepted') {
      console.log(`One-time purchase accepted for ${shopDomain}: ${purchase.name}`);
      
      // You could implement feature unlocking here:
      // - Add extra message credits
      // - Unlock premium features temporarily
      // - Grant special access
      
      // Example: Add bonus messages for one-time purchases
      if (purchase.name.includes('Message Pack')) {
        const bonusMessages = extractMessageCountFromName(purchase.name);
        if (bonusMessages > 0) {
          // Add bonus messages to current subscription
          const subscription = await prisma.subscription.findUnique({
            where: { shopDomain }
          });
          
          if (subscription) {
            await prisma.subscription.update({
              where: { shopDomain },
              data: {
                messagesLimit: subscription.messagesLimit + bonusMessages,
                updatedAt: new Date()
              }
            });
            
            console.log(`Added ${bonusMessages} bonus messages to ${shopDomain}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error("One-time purchase handler error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

function extractMessageCountFromName(name) {
  // Extract number from purchase names like "1000 Message Pack", "5000 Extra Messages", etc.
  const match = name.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
