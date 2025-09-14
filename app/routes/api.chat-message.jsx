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
      sessionId,
      role, // 'user', 'assistant', 'system'
      content,
      responseTime
    } = body;

    console.log(`💬 Message from ${role} in session ${sessionId}`);

    // Find the conversation by sessionId
    const conversation = await prisma.chatConversation.findFirst({
      where: { sessionId }
    });

    if (!conversation) {
      return json(
        { error: "Conversation not found for session" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role,
        content,
        timestamp: new Date(),
        responseTime: responseTime ? parseFloat(responseTime) : null
      }
    });

    // Update conversation message count
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        totalMessages: {
          increment: 1
        },
        updatedAt: new Date()
      }
    });

    console.log(`✅ Saved message ${message.id} to conversation ${conversation.id}`);

    await prisma.$disconnect();

    return json({
      success: true,
      messageId: message.id,
      conversationId: conversation.id,
      message: "Message saved successfully"
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Message tracking error:", error);
    return json(
      { 
        error: "Failed to save message",
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
    endpoint: "chat-message",
    methods: ["POST"],
    description: "Track individual chat messages and response times"
  }, { headers: corsHeaders });
}
