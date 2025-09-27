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

    // Get feedback analytics from your FastAPI backend
    let feedbackAnalytics = {
      summary: {
        total_feedback: 0,
        average_rating: 0,
        positive_feedback: 0,
        negative_feedback: 0,
        response_rate: "0%"
      },
      recent_feedback: [],
      daily_trends: [],
      topic_breakdown: []
    };

    try {
      const feedbackResponse = await fetch(
        `https://cartrecover-bot.onrender.com/api/feedback/analytics/${shopDomain}?days=${days}`
      );

      if (feedbackResponse.ok) {
        const feedbackResult = await feedbackResponse.json();
        if (feedbackResult.success) {
          feedbackAnalytics = feedbackResult.data;
        }
      }
    } catch (feedbackError) {
      console.log("Feedback analytics not available:", feedbackError.message);
    }

    // Mock analytics data (replace with real database calls when available)
    const mockDailyMetrics = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockDailyMetrics.push({
        date: date,
        totalConversations: Math.floor(Math.random() * 50) + 10,
        uniqueVisitors: Math.floor(Math.random() * 40) + 5,
        conversions: Math.floor(Math.random() * 5),
        revenue: Math.random() * 500,
        averageResponseTime: Math.random() * 3 + 1,
        customerSatisfaction: Math.random() * 2 + 3
      });
    }

    const totalConversations = mockDailyMetrics.reduce((sum, day) => sum + day.totalConversations, 0);
    const totalUniqueVisitors = mockDailyMetrics.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const totalConversions = mockDailyMetrics.reduce((sum, day) => sum + day.conversions, 0);
    const totalRevenue = mockDailyMetrics.reduce((sum, day) => sum + day.revenue, 0);

    const avgResponseTime = mockDailyMetrics
      .reduce((sum, day) => sum + day.averageResponseTime, 0) / mockDailyMetrics.length;

    // Use feedback data for customer satisfaction if available
    const avgSatisfaction = feedbackAnalytics.summary.average_rating > 0 
      ? feedbackAnalytics.summary.average_rating 
      : mockDailyMetrics
          .reduce((sum, day) => sum + day.customerSatisfaction, 0) / mockDailyMetrics.length;

    // Mock top questions
    const topQuestions = [
      { question: "What are your shipping options?", count: 45 },
      { question: "How do I return an item?", count: 32 },
      { question: "Is this product in stock?", count: 28 },
      { question: "What payment methods do you accept?", count: 21 },
      { question: "Can I track my order?", count: 18 }
    ];

    // Mock recent conversations
    const recentConversations = [
      { id: "1", customer: "John Doe", topic: "Shipping", timestamp: "2 hours ago", status: "Resolved", satisfaction: "Positive" },
      { id: "2", customer: "Jane Smith", topic: "Returns", timestamp: "4 hours ago", status: "Active", satisfaction: "Neutral" },
      { id: "3", customer: "Bob Johnson", topic: "Product Info", timestamp: "6 hours ago", status: "Converted", satisfaction: "Very Positive" }
    ];

    // Calculate feedback response rate
    const feedbackResponseRate = totalConversations > 0 
      ? ((feedbackAnalytics.summary.total_feedback / totalConversations) * 100).toFixed(1)
      : "0.0";

    const analytics = {
      overview: {
        totalConversations,
        uniqueVisitors: totalUniqueVisitors,
        responseRate: totalUniqueVisitors > 0 ? ((totalConversations / totalUniqueVisitors) * 100).toFixed(1) : "0",
        avgResponseTime: avgResponseTime.toFixed(1),
        customerSatisfaction: avgSatisfaction.toFixed(1),
        conversionsGenerated: totalConversions,
        revenueGenerated: totalRevenue.toFixed(2),
        // Add feedback metrics
        totalFeedback: feedbackAnalytics.summary.total_feedback,
        feedbackResponseRate: feedbackResponseRate + "%",
        positiveFeedback: feedbackAnalytics.summary.positive_feedback,
        negativeFeedback: feedbackAnalytics.summary.negative_feedback
      },
      timeData: mockDailyMetrics.map(day => ({
        date: day.date.toISOString().split('T')[0],
        conversations: day.totalConversations,
        conversions: day.conversions,
        revenue: day.revenue.toFixed(2)
      })),
      topQuestions,
      recentConversations,
      // Add feedback analytics section
      feedback: {
        summary: feedbackAnalytics.summary,
        recent: feedbackAnalytics.recent_feedback.map(feedback => ({
          id: feedback.id,
          rating: feedback.rating,
          feedback_text: feedback.feedback_text,
          customer_name: feedback.customer_name || "Anonymous",
          topic: feedback.topic || "General",
          submitted_at: feedback.submitted_at,
          session_id: feedback.session_id
        })),
        dailyTrends: feedbackAnalytics.daily_trends,
        topicBreakdown: feedbackAnalytics.topic_breakdown
      },
      shopDomain,
      dateRange: {
        start: mockDailyMetrics[0].date.toISOString().split('T')[0],
        end: mockDailyMetrics[mockDailyMetrics.length - 1].date.toISOString().split('T')[0]
      }
    };

    return json(analytics, { headers: corsHeaders });

  } catch (error) {
    console.error("Enhanced analytics fetch error:", error);
    return json({ error: "Failed to fetch analytics" }, { status: 500, headers: corsHeaders });
  }
}
