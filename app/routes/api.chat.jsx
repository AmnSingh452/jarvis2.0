import { json } from "@remix-run/node";

// Simple in-memory cache to reduce API calls
const chatCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Helper function to track conversation and messages
async function trackConversation(payload, externalResponse) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const shopDomain = payload.shop_domain || payload.shopDomain;
    const sessionId = payload.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = payload.message || payload.query || "";
    const botResponse = externalResponse?.message || externalResponse?.response || "";

    if (!shopDomain) {
      console.log("⚠️ No shop domain provided, skipping conversation tracking");
      return;
    }

    // Check if conversation exists for this session
    let conversation = await prisma.chatConversation.findFirst({
      where: { sessionId }
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          shopDomain,
          customerIp: payload.customer_ip || "unknown",
          customerName: payload.customer_name || null,
          startTime: new Date(),
          totalMessages: 0,
          topic: payload.topic || 'General',
          status: 'active'
        }
      });
      console.log(`✅ Created new conversation ${conversation.id} for ${shopDomain}`);
    }

    // Track user message
    if (userMessage.trim()) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
          responseTime: null
        }
      });
    }

    // Track bot response with timing
    if (botResponse.trim()) {
      const responseTime = payload.response_time || 1.5; // Default response time
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: botResponse,
          timestamp: new Date(),
          responseTime: parseFloat(responseTime)
        }
      });
    }

    // Update conversation message count
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        totalMessages: {
          increment: userMessage.trim() ? (botResponse.trim() ? 2 : 1) : (botResponse.trim() ? 1 : 0)
        },
        updatedAt: new Date()
      }
    });

    // Update or create daily analytics metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analyticsMetrics.upsert({
      where: {
        shopDomain_date: {
          shopDomain,
          date: today
        }
      },
      update: {
        totalMessages: {
          increment: userMessage.trim() ? (botResponse.trim() ? 2 : 1) : (botResponse.trim() ? 1 : 0)
        },
        updatedAt: new Date()
      },
      create: {
        shopDomain,
        date: today,
        totalConversations: 0, // Will be updated separately
        uniqueVisitors: 1,
        totalMessages: userMessage.trim() ? (botResponse.trim() ? 2 : 1) : (botResponse.trim() ? 1 : 0),
        averageResponseTime: parseFloat(responseTime || 1.5),
        conversions: 0,
        revenue: 0,
        customerSatisfaction: null,
        topQuestions: []
      }
    });

    await prisma.$disconnect();
    console.log(`✅ Tracked conversation and updated analytics for ${shopDomain}`);

  } catch (error) {
    console.error("❌ Error tracking conversation:", error);
  }
}

// Handle POST requests for chat
export async function action({ request }) {
  try {
    console.log("🔎 Chat API request received");
    
    // Parse the incoming request
    const requestText = await request.text();
    console.log("🔎 Request body:", requestText);
    
    if (!requestText || requestText.trim() === "") {
      console.error("❌ Empty request body received");
      return new Response(JSON.stringify({
        success: false,
        data: {
          response: "I didn't receive your message properly. Please try typing it again.",
          session_id: null
        },
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Widget expects 200 status
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }

    let payload;
    try {
      payload = JSON.parse(requestText);
    } catch (parseError) {
      console.error("❌ Invalid JSON in request body:", parseError);
      return new Response(JSON.stringify({
        success: false,
        data: {
          response: "I had trouble understanding your message format. Please try again.",
          session_id: null
        },
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Widget expects 200 status
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }

    console.log("🔎 Parsed payload:", payload);

    // Forward to external API
    try {
      const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Shopify-Chatbot-Proxy/1.0"
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log("🔎 External API response:", response.status, responseText);

      // Parse the external API response
      let externalData;
      try {
        externalData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse external API response:", parseError);
        return new Response(JSON.stringify({
          success: false,
          data: {
            response: "Sorry, I'm having trouble connecting right now. Please try again.",
            session_id: payload.session_id
          },
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      }

      // Transform the external API response to match widget expectations
      const transformedResponse = {
        success: externalData.success || false,
        data: {
          response: externalData.message || externalData.response || "I received your message but couldn't generate a proper response.",
          session_id: externalData.session_id || payload.session_id,
          // Include any additional data from external API
          ...(externalData.data && typeof externalData.data === 'object' ? externalData.data : {})
        },
        timestamp: new Date().toISOString()
      };

      console.log("🔄 Transformed response for widget:", transformedResponse);

      // Track conversation and analytics in background (don't wait for it)
      setImmediate(() => {
        trackConversation(payload, externalData).catch(err => 
          console.error("Background conversation tracking failed:", err)
        );
      });

      // Return transformed response with same status as external API
      return new Response(JSON.stringify(transformedResponse), {
        status: response.status === 200 ? 200 : 200, // Always return 200 for widget compatibility
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });

    } catch (fetchError) {
      console.error("❌ External API fetch error:", fetchError);
      return new Response(JSON.stringify({
        success: false,
        data: {
          response: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
          session_id: payload.session_id
        },
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Return 200 for widget compatibility
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }
    
  } catch (error) {
    console.error("❌ Chat API proxy error:", error);
    return new Response(JSON.stringify({
      success: false,
      data: {
        response: "I'm experiencing some technical difficulties. Please try again in a moment.",
        session_id: null
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Widget expects 200 status
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  }
}

// Handle GET requests (if needed)
export async function loader({ request }) {
  return json({
    success: true,
    message: "Chat API endpoint is active",
    method: "POST",
    endpoint: "/api/chat",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
