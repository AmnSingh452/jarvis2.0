import { json } from "@remix-run/node";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

// Handle OPTIONS preflight requests
export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

export async function loader({ request }) {

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

    // Get recent conversations (more inclusive - get all recent conversations for the shop)
    const recentConversations = await prisma.chatConversation.findMany({
      where: {
        shopDomain
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

    // Get real-time conversation count directly from database
    const actualTotalConversations = await prisma.chatConversation.count({
      where: {
        shopDomain,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate aggregate metrics from daily metrics (for historical data)
    const metricsConversations = dailyMetrics.reduce((sum, day) => sum + day.totalConversations, 0);
    const totalUniqueVisitors = dailyMetrics.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const totalConversions = dailyMetrics.reduce((sum, day) => sum + day.conversions, 0);
    const totalRevenue = dailyMetrics.reduce((sum, day) => sum + Number(day.revenue), 0);

    // Use the higher count between actual conversations and metrics (ensures real-time accuracy)
    const totalConversations = Math.max(actualTotalConversations, metricsConversations);

    const avgResponseTime = dailyMetrics
      .filter(day => day.averageResponseTime)
      .reduce((sum, day, _, arr) => sum + day.averageResponseTime / arr.length, 0);

    const avgSatisfaction = dailyMetrics
      .filter(day => day.customerSatisfaction)
      .reduce((sum, day, _, arr) => sum + day.customerSatisfaction / arr.length, 0);

    // Calculate recent activity metrics
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const conversationsLast24h = await prisma.chatConversation.count({
      where: {
        shopDomain,
        startTime: {
          gte: last24Hours
        }
      }
    });

    // Get active sessions (conversations started in last hour that haven't ended)
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const activeSessions = await prisma.chatConversation.count({
      where: {
        shopDomain,
        startTime: {
          gte: lastHour
        },
        OR: [
          { endTime: null },
          { endTime: { gte: lastHour } }
        ]
      }
    });

    // Calculate average session duration from completed conversations
    const completedConversations = await prisma.chatConversation.findMany({
      where: {
        shopDomain,
        endTime: { not: null },
        startTime: { gte: startDate }
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    const avgSessionDuration = completedConversations.length > 0 
      ? completedConversations.reduce((sum, conv) => {
          const duration = (new Date(conv.endTime) - new Date(conv.startTime)) / (1000 * 60); // minutes
          return sum + duration;
        }, 0) / completedConversations.length
      : 0;

    // Calculate messages per session
    const totalMessages = await prisma.chatMessage.count({
      where: {
        conversation: {
          shopDomain,
          startTime: { gte: startDate }
        }
      }
    });

    const messagesPerSession = totalConversations > 0 ? (totalMessages / totalConversations) : 0;

    // Calculate returning visitors (users with multiple conversations based on customerName and customerIp)
    const conversationsWithCustomerInfo = await prisma.chatConversation.findMany({
      where: {
        shopDomain,
        startTime: { gte: startDate },
        OR: [
          { customerName: { not: null } },
          { customerIp: { not: null } }
        ]
      },
      select: {
        customerName: true,
        customerIp: true
      }
    });

    // Group by customer identifier and count conversations per customer
    const customerGroups = {};
    conversationsWithCustomerInfo.forEach(conv => {
      const key = conv.customerName || conv.customerIp || 'anonymous';
      customerGroups[key] = (customerGroups[key] || 0) + 1;
    });

    // Count customers with more than 1 conversation
    const returningCustomers = Object.values(customerGroups).filter(count => count > 1).length;
    const totalCustomersWithInfo = Object.keys(customerGroups).length;
    
    const returningVisitorsPercentage = totalCustomersWithInfo > 0 
      ? ((returningCustomers / totalCustomersWithInfo) * 100) 
      : 0;

    // Get top questions from analytics metrics (aggregated from all daily metrics)
    const allTopQuestions = [];
    dailyMetrics.forEach(metric => {
      if (metric.topQuestions && Array.isArray(metric.topQuestions)) {
        metric.topQuestions.forEach(q => {
          const existing = allTopQuestions.find(tq => tq.question === q.question);
          if (existing) {
            existing.count += q.count;
          } else {
            allTopQuestions.push({ question: q.question, count: q.count });
          }
        });
      }
    });

    const topQuestions = allTopQuestions
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const analytics = {
      overview: {
        totalConversations,
        uniqueVisitors: Math.max(totalUniqueVisitors, totalConversations), // Ensure visitors >= conversations
        responseRate: totalUniqueVisitors > 0 ? ((totalConversations / totalUniqueVisitors) * 100).toFixed(1) : totalConversations > 0 ? "100.0" : "0",
        avgResponseTime: avgResponseTime > 0 ? avgResponseTime.toFixed(1) : "N/A",
        customerSatisfaction: avgSatisfaction > 0 ? avgSatisfaction.toFixed(1) : "N/A",
        conversionsGenerated: totalConversions,
        revenueGenerated: totalRevenue.toFixed(2),
        // New fields for enhanced analytics
        activeSessions,
        avgSessionDuration: avgSessionDuration.toFixed(1),
        conversationsLast24h,
        messagesPerSession: messagesPerSession.toFixed(1),
        returningVisitorsPercentage: returningVisitorsPercentage.toFixed(1)
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
