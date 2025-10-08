import { json } from "@remix-run/node";

// Simple in-memory cache to reduce API calls
const chatCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Function to check conversation limits
async function checkConversationLimit(shopDomain) {
  try {
    const response = await fetch(`https://jarvis2-0-djg1.onrender.com/api/conversation-limit?shop=${shopDomain}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return await response.json();
    } else {
      console.error("Failed to check conversation limit:", response.status);
      return { allowed: true }; // Allow by default if check fails
    }
  } catch (error) {
    console.error("Error checking conversation limit:", error);
    return { allowed: true }; // Allow by default if check fails
  }
}

// Track analytics events
async function trackAnalyticsEvents(payload, response) {
  try {
    const shopDomain = payload.shop_domain || 'unknown-shop.myshopify.com';
    const sessionId = payload.session_id;
    const message = payload.message;

    // Track conversation start (if new session)
    if (sessionId && !chatCache.has(`session_${sessionId}`)) {
      await fetch("https://jarvis2-0-djg1.onrender.com/api/analytics-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "conversation_start",
          shopDomain,
          sessionId,
          data: {}
        })
      });
      
      // Mark session as tracked
      chatCache.set(`session_${sessionId}`, true);
    }

    // Track message
    await fetch("https://jarvis2-0-djg1.onrender.com/api/analytics-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "message",
        shopDomain,
        sessionId,
        data: { messageLength: message?.length || 0 }
      })
    });

    // Track question if message is a question
    if (message) {
      await fetch("https://jarvis2-0-djg1.onrender.com/api/analytics-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "question",
          shopDomain,
          sessionId,
          data: { question: message }
        })
      });
    }

  } catch (error) {
    console.warn("Analytics tracking error:", error.message);
  }
}

// Save conversation to database
async function saveConversationToDatabase(payload, response) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const shopDomain = payload.shop_domain || 'unknown-shop.myshopify.com';
    const sessionId = payload.session_id;
    const customerMessage = payload.message;
    const botResponse = response.data?.response;

    if (!sessionId || !customerMessage) return;

    // Check if conversation exists
    let conversation = await prisma.chatConversation.findUnique({
      where: { sessionId }
    });

    // Create new conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          shopDomain,
          customerName: "Anonymous", // We don't have customer name from widget
          topic: inferTopicFromMessage(customerMessage),
          startTime: new Date(),
          converted: false,
          conversionValue: 0
        }
      });
    }

    // Save the message exchange
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'customer',
        message: customerMessage,
        timestamp: new Date()
      }
    });

    if (botResponse) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          sender: 'bot', 
          message: botResponse,
          timestamp: new Date()
        }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.warn("Database saving error:", error.message);
  }
}

// Simple function to infer topic from customer message
function inferTopicFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('ship')) {
    return 'Shipping';
  } else if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('exchange')) {
    return 'Returns';
  } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
    return 'Pricing';
  } else if (lowerMessage.includes('size') || lowerMessage.includes('fit') || lowerMessage.includes('color')) {
    return 'Product Info';
  } else if (lowerMessage.includes('order') || lowerMessage.includes('track')) {
    return 'Order Status';
  } else {
    return 'General';
  }
}

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

    // Check conversation limits before processing
    const shopDomain = payload.shop_domain || 'unknown-shop.myshopify.com';
    const limitCheck = await checkConversationLimit(shopDomain);
    
    if (!limitCheck.allowed) {
      console.log("🚫 Conversation limit reached for shop:", shopDomain);
      
      let errorMessage;
      if (limitCheck.trialExpired) {
        errorMessage = `Your 14-day free trial has ended! You used the chatbot for ${limitCheck.daysInTrial} days. Subscribe to continue using Jarvis AI - choose Essential ($19/month, 1000 conversations) or Sales Pro ($49/month, unlimited conversations).`;
      } else if (limitCheck.planName === 'essential') {
        errorMessage = `You've reached your monthly conversation limit (${limitCheck.used}/${limitCheck.limit}). Upgrade to Sales Pro for unlimited conversations!`;
      } else {
        errorMessage = `Monthly conversation limit reached (${limitCheck.used}/${limitCheck.limit}). Please contact support for assistance.`;
      }
      
      return new Response(JSON.stringify({
        success: false,
        data: {
          response: errorMessage,
          session_id: payload.session_id,
          limitReached: true,
          trialExpired: limitCheck.trialExpired || false,
          planInfo: {
            used: limitCheck.used,
            limit: limitCheck.limit,
            planName: limitCheck.planName,
            isTrial: limitCheck.isTrial || false,
            trialDaysRemaining: limitCheck.trialDaysRemaining || 0
          }
        },
        timestamp: new Date().toISOString()
      }), {
        status: 429, // Too Many Requests
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }

    console.log("✅ Conversation limit check passed:", limitCheck.used, "/", limitCheck.limit);

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

      // Track analytics events and save conversation in the background
      Promise.all([
        trackAnalyticsEvents(payload, transformedResponse),
        saveConversationToDatabase(payload, transformedResponse)
      ]).catch(err => 
        console.warn("⚠️ Background tracking failed:", err.message)
      );

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
