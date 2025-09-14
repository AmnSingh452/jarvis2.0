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
      action, // 'start', 'update', 'end'
      sessionId,
      shopDomain,
      customerIp,
      customerName,
      topic,
      customerSatisfaction,
      converted,
      conversionValue
    } = body;

    console.log(`📊 Chat Session ${action}:`, { sessionId, shopDomain, topic });

    let conversation;

    if (action === 'start') {
      // Create new conversation
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          shopDomain,
          customerIp,
          customerName: customerName || null,
          startTime: new Date(),
          totalMessages: 0,
          topic: topic || 'General',
          status: 'active'
        }
      });

      console.log(`✅ Started conversation ${conversation.id} for ${shopDomain}`);

    } else if (action === 'update') {
      // Update existing conversation
      const updateData = {};
      if (customerName) updateData.customerName = customerName;
      if (topic) updateData.topic = topic;
      if (customerSatisfaction) updateData.customerSatisfaction = parseFloat(customerSatisfaction);
      if (converted !== undefined) updateData.converted = converted;
      if (conversionValue) updateData.conversionValue = parseFloat(conversionValue);

      conversation = await prisma.chatConversation.update({
        where: {
          sessionId: sessionId
        },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      console.log(`📝 Updated conversation ${conversation.id}`);

    } else if (action === 'end') {
      // End conversation
      const updateData = {
        endTime: new Date(),
        status: 'completed',
        updatedAt: new Date()
      };

      if (customerSatisfaction) updateData.customerSatisfaction = parseFloat(customerSatisfaction);
      if (converted !== undefined) updateData.converted = converted;
      if (conversionValue) updateData.conversionValue = parseFloat(conversionValue);

      conversation = await prisma.chatConversation.update({
        where: {
          sessionId: sessionId
        },
        data: updateData
      });

      console.log(`🏁 Ended conversation ${conversation.id}`);
    }

    await prisma.$disconnect();

    return json({
      success: true,
      conversationId: conversation?.id,
      message: `Conversation ${action} successful`
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Chat session tracking error:", error);
    return json(
      { 
        error: "Failed to track chat session",
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
    endpoint: "chat-session",
    methods: ["POST"],
    description: "Track chat session lifecycle (start, update, end)"
  }, { headers: corsHeaders });
}
