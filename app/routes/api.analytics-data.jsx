import { json } from "@remix-run/node";

export async function loader({ request }) {
  // Add CORS headers for cross-origin requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");
    const days = parseInt(url.searchParams.get("days") || "30");

    if (!shopDomain) {
      return json({ error: "Shop parameter required" }, { status: 400, headers: corsHeaders });
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily metrics for the period
    const dailyMetrics = await prisma.analyticsMetrics.findMany({
      where: {
        shopDomain,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Get recent conversations
    const recentConversations = await prisma.chatConversation.findMany({
      where: {
        shopDomain,
        startTime: {
          gte: startDate
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10,
      include: {
        chatMessages: {
          take: 1,
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    // Calculate aggregate metrics
    const totalConversations = dailyMetrics.reduce((sum, day) => sum + day.totalConversations, 0);
    const totalUniqueVisitors = dailyMetrics.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const totalConversions = dailyMetrics.reduce((sum, day) => sum + day.conversions, 0);
    const totalRevenue = dailyMetrics.reduce((sum, day) => sum + Number(day.revenue), 0);

    const avgResponseTime = dailyMetrics
      .filter(day => day.averageResponseTime)
      .reduce((sum, day, _, arr) => sum + day.averageResponseTime / arr.length, 0);

    const avgSatisfaction = dailyMetrics
      .filter(day => day.customerSatisfaction)
      .reduce((sum, day, _, arr) => sum + day.customerSatisfaction / arr.length, 0);

    // Get top questions (this would need more sophisticated text analysis in production)
    const allConversations = await prisma.chatConversation.findMany({
      where: {
        shopDomain,
        startTime: {
          gte: startDate
        }
      },
      include: {
        chatMessages: {
          where: {
            role: 'user'
          },
          take: 1,
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    // Simple topic analysis (in production, you'd use NLP)
    const topicCounts = {};
    allConversations.forEach(conv => {
      const topic = conv.topic || 'General';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    const topQuestions = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({
        question: getQuestionForTopic(topic),
        count
      }));

    const analytics = {
      overview: {
        totalConversations,
        uniqueVisitors: totalUniqueVisitors,
        responseRate: totalConversations > 0 ? ((totalConversations / totalUniqueVisitors) * 100).toFixed(1) : "0",
        avgResponseTime: avgResponseTime.toFixed(1),
        customerSatisfaction: avgSatisfaction.toFixed(1),
        conversionsGenerated: totalConversions,
        revenueGenerated: totalRevenue.toFixed(2)
      },
      timeData: dailyMetrics.map(day => ({
        date: day.date.toISOString().split('T')[0],
        conversations: day.totalConversations,
        conversions: day.conversions,
        revenue: Number(day.revenue)
      })),
      topQuestions,
      recentConversations: recentConversations.map(conv => ({
        id: conv.id,
        customer: conv.customerName || "Anonymous Customer",
        topic: conv.topic || "General",
        timestamp: formatTimeAgo(conv.startTime),
        status: conv.converted ? "Converted" : (conv.status === "completed" ? "Resolved" : "Active"),
        satisfaction: getSatisfactionLabel(conv.customerSatisfaction)
      })),
      shopDomain,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };

    return json(analytics, { headers: corsHeaders });

  } catch (error) {
    console.error("Analytics fetch error:", error);
    return json({ error: "Failed to fetch analytics" }, { status: 500, headers: corsHeaders });
  }
}

// Helper functions
function getQuestionForTopic(topic) {
  const topicQuestions = {
    'General': 'General inquiries and support',
    'Shipping': 'What are your shipping options?',
    'Returns': 'How do I return an item?',
    'Payment': 'What payment methods do you accept?',
    'Product': 'Tell me about this product',
    'Stock': 'Is this item in stock?',
    'Order': 'Can I track my order?'
  };
  return topicQuestions[topic] || `Questions about ${topic.toLowerCase()}`;
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function getSatisfactionLabel(rating) {
  if (!rating) return 'Not rated';
  if (rating >= 4.5) return 'Very Positive';
  if (rating >= 3.5) return 'Positive';
  if (rating >= 2.5) return 'Neutral';
  if (rating >= 1.5) return 'Negative';
  return 'Very Negative';
}
