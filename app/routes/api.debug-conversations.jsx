import { json } from "@remix-run/node";
import { prisma } from "../db.server.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return json({ error: "Shop parameter is required" }, { status: 400 });
  }

  try {
    // Get shop info
    const shop = await prisma.shop.findFirst({
      where: { shopDomain }
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    // Get all conversations with their timestamps
    const allConversations = await prisma.chatConversation.findMany({
      where: { shopDomain },
      select: {
        id: true,
        startTime: true,
        createdAt: true
      },
      orderBy: { startTime: 'asc' }
    });

    // Count conversations from installation date
    const conversationsFromInstall = await prisma.chatConversation.count({
      where: {
        shopDomain,
        startTime: { gte: shop.installedAt }
      }
    });

    return json({
      shopDomain,
      installedAt: shop.installedAt,
      totalConversations: allConversations.length,
      conversationsFromInstall,
      conversations: allConversations.map(conv => ({
        id: conv.id,
        startTime: conv.startTime,
        createdAt: conv.createdAt,
        isAfterInstall: conv.startTime >= shop.installedAt
      }))
    });

  } catch (error) {
    console.error("Debug conversations error:", error);
    return json({ error: "Failed to debug conversations" }, { status: 500 });
  }
}