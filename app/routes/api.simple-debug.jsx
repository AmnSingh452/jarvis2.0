import { json } from "@remix-run/node";
import prisma from "../db.server.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return json({ error: "Shop parameter is required" }, { status: 400 });
  }

  try {
    // Check basic counts
    const totalConversations = await prisma.chatConversation.count({
      where: { shopDomain }
    });

    const totalMessages = await prisma.chatMessage.count({
      where: {
        conversation: { shopDomain }
      }
    });

    // Get recent conversations with basic info
    const recentConversations = await prisma.chatConversation.findMany({
      where: { shopDomain },
      orderBy: { startTime: 'desc' },
      take: 5,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        customerName: true,
        topic: true,
        status: true
      }
    });

    // Check active sessions (last hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const activeSessions = await prisma.chatConversation.count({
      where: {
        shopDomain,
        startTime: { gte: oneHourAgo },
        OR: [
          { endTime: null },
          { endTime: { gte: oneHourAgo } }
        ]
      }
    });

    // Check shop info
    const shop = await prisma.shop.findFirst({
      where: { shopDomain }
    });

    return json({
      shopDomain,
      shopInstalled: shop?.installedAt,
      counts: {
        totalConversations,
        totalMessages,
        activeSessions,
        recentConversationsCount: recentConversations.length
      },
      recentConversations: recentConversations.map(conv => ({
        id: conv.id,
        startTime: conv.startTime,
        endTime: conv.endTime,
        customer: conv.customerName || "Anonymous",
        topic: conv.topic || "General",
        status: conv.status,
        duration: conv.endTime ? 
          Math.round((new Date(conv.endTime) - new Date(conv.startTime)) / (1000 * 60)) : 
          "Ongoing"
      }))
    });

  } catch (error) {
    console.error("Simple debug error:", error);
    return json({ error: "Failed to fetch debug data", details: error.message }, { status: 500 });
  }
}