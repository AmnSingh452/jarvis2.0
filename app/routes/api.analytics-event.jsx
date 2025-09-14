import { json } from "@remix-run/node";

export async function action({ request }) {
  // Add CORS headers for cross-origin requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const body = await request.json();
    const {
      eventType, // 'visitor', 'engagement', 'conversion', 'satisfaction'
      shopDomain,
      sessionId,
      data // Additional event-specific data
    } = body;

    console.log(`📈 Analytics Event: ${eventType} for ${shopDomain}`);

    // Get today's date for metrics aggregation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's metrics record
    let metrics = await prisma.analyticsMetrics.findUnique({
      where: {
        shopDomain_date: {
          shopDomain,
          date: today
        }
      }
    });

    if (!metrics) {
      metrics = await prisma.analyticsMetrics.create({
        data: {
          shopDomain,
          date: today,
          totalConversations: 0,
          uniqueVisitors: 0,
          totalMessages: 0,
          conversions: 0,
          revenue: 0,
          topQuestions: []
        }
      });
    }

    // Update metrics based on event type
    const updateData = {};

    switch (eventType) {
      case 'visitor':
        updateData.uniqueVisitors = { increment: 1 };
        break;

      case 'conversation_start':
        updateData.totalConversations = { increment: 1 };
        break;

      case 'message':
        updateData.totalMessages = { increment: 1 };
        if (data?.responseTime) {
          // Calculate new average response time
          const currentAvg = metrics.averageResponseTime || 0;
          const currentCount = metrics.totalMessages || 1;
          const newAvg = (currentAvg * currentCount + parseFloat(data.responseTime)) / (currentCount + 1);
          updateData.averageResponseTime = newAvg;
        }
        break;

      case 'conversion':
        updateData.conversions = { increment: 1 };
        if (data?.value) {
          updateData.revenue = { increment: parseFloat(data.value) };
        }
        break;

      case 'satisfaction':
        if (data?.rating) {
          // Calculate new average satisfaction
          const currentAvg = metrics.customerSatisfaction || 0;
          const currentCount = metrics.conversions || 1;
          const newAvg = (currentAvg * currentCount + parseFloat(data.rating)) / (currentCount + 1);
          updateData.customerSatisfaction = newAvg;
        }
        break;

      case 'question':
        if (data?.question) {
          // Update top questions JSON
          const currentQuestions = metrics.topQuestions || [];
          const existingQ = currentQuestions.find(q => q.question === data.question);
          
          let newQuestions;
          if (existingQ) {
            newQuestions = currentQuestions.map(q => 
              q.question === data.question 
                ? { ...q, count: q.count + 1 }
                : q
            );
          } else {
            newQuestions = [...currentQuestions, { question: data.question, count: 1 }];
          }
          
          // Keep top 10 questions only
          newQuestions.sort((a, b) => b.count - a.count);
          updateData.topQuestions = newQuestions.slice(0, 10);
        }
        break;
    }

    // Update the metrics record
    if (Object.keys(updateData).length > 0) {
      await prisma.analyticsMetrics.update({
        where: { id: metrics.id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Updated ${eventType} metrics for ${shopDomain}`);
    }

    await prisma.$disconnect();

    return json({
      success: true,
      eventType,
      message: "Analytics event processed successfully"
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Analytics event error:", error);
    return json(
      { 
        error: "Failed to process analytics event",
        details: error.message 
      }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function loader({ request }) {
  // Add CORS headers for GET requests too
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  };

  return json({ 
    endpoint: "analytics-event",
    methods: ["POST"],
    description: "Track real-time analytics events (visitor, conversation, message, conversion, satisfaction, question)",
    eventTypes: [
      "visitor - Track unique visitors",
      "conversation_start - Track new conversations",
      "message - Track messages and response times", 
      "conversion - Track conversions and revenue",
      "satisfaction - Track customer satisfaction ratings",
      "question - Track frequently asked questions"
    ]
  }, { headers: corsHeaders });
}
