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
      shopDomain,
      conversations, // Array of conversation objects
      dailyMetrics   // Array of daily metrics objects
    } = body;

    console.log(`📦 Bulk sync for ${shopDomain}: ${conversations?.length || 0} conversations, ${dailyMetrics?.length || 0} daily metrics`);

    let processedConversations = 0;
    let processedMetrics = 0;

    // Process conversations in batches
    if (conversations && conversations.length > 0) {
      for (const convData of conversations) {
        try {
          // Check if conversation already exists
          const existing = await prisma.chatConversation.findFirst({
            where: { sessionId: convData.sessionId }
          });

          if (!existing) {
            // Create new conversation
            const conversation = await prisma.chatConversation.create({
              data: {
                sessionId: convData.sessionId,
                shopDomain,
                customerIp: convData.customerIp,
                customerName: convData.customerName,
                startTime: new Date(convData.startTime),
                endTime: convData.endTime ? new Date(convData.endTime) : null,
                totalMessages: convData.totalMessages || 0,
                customerSatisfaction: convData.customerSatisfaction ? parseFloat(convData.customerSatisfaction) : null,
                converted: convData.converted || false,
                conversionValue: convData.conversionValue ? parseFloat(convData.conversionValue) : null,
                topic: convData.topic || 'General',
                status: convData.status || 'completed'
              }
            });

            // Add messages if provided
            if (convData.messages && convData.messages.length > 0) {
              for (const msgData of convData.messages) {
                await prisma.chatMessage.create({
                  data: {
                    conversationId: conversation.id,
                    role: msgData.role,
                    content: msgData.content,
                    timestamp: new Date(msgData.timestamp),
                    responseTime: msgData.responseTime ? parseFloat(msgData.responseTime) : null
                  }
                });
              }
            }

            processedConversations++;
          }
        } catch (convError) {
          console.error(`Error processing conversation ${convData.sessionId}:`, convError);
        }
      }
    }

    // Process daily metrics
    if (dailyMetrics && dailyMetrics.length > 0) {
      for (const metricData of dailyMetrics) {
        try {
          const date = new Date(metricData.date);
          date.setHours(0, 0, 0, 0);

          // Upsert daily metrics
          await prisma.analyticsMetrics.upsert({
            where: {
              shopDomain_date: {
                shopDomain,
                date
              }
            },
            update: {
              totalConversations: metricData.totalConversations || 0,
              uniqueVisitors: metricData.uniqueVisitors || 0,
              totalMessages: metricData.totalMessages || 0,
              averageResponseTime: metricData.averageResponseTime ? parseFloat(metricData.averageResponseTime) : null,
              conversions: metricData.conversions || 0,
              revenue: metricData.revenue ? parseFloat(metricData.revenue) : 0,
              customerSatisfaction: metricData.customerSatisfaction ? parseFloat(metricData.customerSatisfaction) : null,
              topQuestions: metricData.topQuestions || [],
              updatedAt: new Date()
            },
            create: {
              shopDomain,
              date,
              totalConversations: metricData.totalConversations || 0,
              uniqueVisitors: metricData.uniqueVisitors || 0,
              totalMessages: metricData.totalMessages || 0,
              averageResponseTime: metricData.averageResponseTime ? parseFloat(metricData.averageResponseTime) : null,
              conversions: metricData.conversions || 0,
              revenue: metricData.revenue ? parseFloat(metricData.revenue) : 0,
              customerSatisfaction: metricData.customerSatisfaction ? parseFloat(metricData.customerSatisfaction) : null,
              topQuestions: metricData.topQuestions || []
            }
          });

          processedMetrics++;
        } catch (metricError) {
          console.error(`Error processing metric for ${metricData.date}:`, metricError);
        }
      }
    }

    console.log(`✅ Bulk sync completed: ${processedConversations} conversations, ${processedMetrics} metrics`);

    await prisma.$disconnect();

    return json({
      success: true,
      processedConversations,
      processedMetrics,
      message: "Bulk sync completed successfully"
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Bulk sync error:", error);
    return json(
      { 
        error: "Failed to sync bulk data",
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
    endpoint: "bulk-sync",
    methods: ["POST"],
    description: "Sync bulk conversation and metrics data",
    format: {
      shopDomain: "string",
      conversations: [
        {
          sessionId: "string",
          customerIp: "string",
          customerName: "string",
          startTime: "ISO date",
          endTime: "ISO date",
          totalMessages: "number",
          customerSatisfaction: "number (1-5)",
          converted: "boolean",
          conversionValue: "number",
          topic: "string",
          status: "string",
          messages: [
            {
              role: "user|assistant|system",
              content: "string",
              timestamp: "ISO date",
              responseTime: "number (seconds)"
            }
          ]
        }
      ],
      dailyMetrics: [
        {
          date: "ISO date",
          totalConversations: "number",
          uniqueVisitors: "number",
          totalMessages: "number",
          averageResponseTime: "number",
          conversions: "number",
          revenue: "number",
          customerSatisfaction: "number",
          topQuestions: [
            { question: "string", count: "number" }
          ]
        }
      ]
    }
  }, { headers: corsHeaders });
}
