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

// Handle POST requests for chat - using the exact working pattern from recommendations
export async function action({ request }) {
  try {
    // EXACT same approach as working recommendations endpoint
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    console.log("🔎 Chat-v2 Raw request body:", body);
    console.log("🔎 Chat-v2 Body length:", body?.length || 0);
    
    // Create cache key from request body
    const cacheKey = Buffer.from(body).toString('base64').slice(0, 50);
    const now = Date.now();

    // Check cache first
    if (chatCache.has(cacheKey)) {
      const cached = chatCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL) {
        console.log("📋 Returning cached chat response");
        return new Response(cached.data, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Cache": "HIT"
          }
        });
      } else {
        chatCache.delete(cacheKey);
      }
    }

    console.log("🤖 Chat-v2 API request received");

    // Retry logic for rate limiting
    let retryCount = 0;
    const maxRetries = 2;
    let response;

    while (retryCount <= maxRetries) {
      try {
        response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": contentType || "application/json",
            "User-Agent": "Shopify-Chatbot-Proxy/1.0"
          },
          body: body
        });

        if (response.status === 429 && retryCount < maxRetries) {
          const retryAfter = response.headers.get("retry-after") || "2";
          const waitTime = Math.min(parseInt(retryAfter) * 1000, 5000);
          console.log(`⏳ Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        break;
      } catch (fetchError) {
        console.error(`❌ Fetch attempt ${retryCount + 1} failed:`, fetchError);
        if (retryCount === maxRetries) throw fetchError;
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const responseData = await response.text();
    console.log("🔎 External API response:", responseData);
    
    if (response.status === 200) {
      console.log("✅ Chat-v2 API responded successfully");
      chatCache.set(cacheKey, {
        data: responseData,
        timestamp: now
      });
      
      return new Response(responseData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "MISS"
        }
      });
    } else {
      console.log(`⚠️ External API returned ${response.status}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Chat service unavailable",
        data: responseData,
        timestamp: new Date().toISOString()
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error("❌ Chat-v2 API proxy error:", error);
    return json({
      success: false,
      error: "Chat service unavailable",
      message: "Unable to connect to chat service. Please try again later.",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle GET requests
export async function loader({ request }) {
  return json({
    success: true,
    message: "Chat API v2 endpoint is active",
    method: "POST",
    endpoint: "/api/chat-v2",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
