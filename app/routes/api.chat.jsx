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
