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
    // Parse the incoming request
    const body = JSON.stringify(await request.json());
    const contentType = request.headers.get("content-type");
    console.log("🔎 Raw request body:", body);

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
        // Remove expired entry
        chatCache.delete(cacheKey);
      }
    }

    console.log("🤖 Chat API request received:", {
      method: request.method,
      contentType,
      bodyLength: body.length
    });

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

        // If we get a 429, wait and retry
        if (response.status === 429 && retryCount < maxRetries) {
          const retryAfter = response.headers.get("retry-after") || "2";
          const waitTime = Math.min(parseInt(retryAfter) * 1000, 5000); // Max 5 seconds
          console.log(`⏳ Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        // Success or non-retryable error, break the loop
        break;
      } catch (fetchError) {
        console.error(`❌ Fetch attempt ${retryCount + 1} failed:`, fetchError);
        if (retryCount === maxRetries) throw fetchError;
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const rawResponse = await response.text();
    console.log("🔎 Raw external API response:", rawResponse);
    let responseData;
    try {
      responseData = JSON.parse(rawResponse);
    } catch (jsonErr) {
      console.error("❌ Failed to parse external API response as JSON:", jsonErr);
      responseData = rawResponse; // fallback to raw text
    }
    if (response.status !== 200) {
      console.error(`🔴 External API error response (${response.status}):`, responseData);
    }

    // Cache successful responses
    if (response.status === 200) {
      console.log("✅ Chat API responded successfully");
      chatCache.set(cacheKey, {
        data: JSON.stringify(responseData),
        timestamp: now
      });

      // Clean old cache entries periodically
      if (chatCache.size > 100) {
        const entries = Array.from(chatCache.entries());
        entries.forEach(([key, value]) => {
          if (now - value.timestamp > CACHE_TTL) {
            chatCache.delete(key);
          }
        });
      }
    } else if (response.status === 429) {
      console.log("⚠️ Rate limited after retries, returning error");
      return new Response(JSON.stringify({
        success: false,
        error: "Service temporarily unavailable due to rate limiting",
        data: null,
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "RATE_LIMITED"
        }
      });
    } else {
      console.log(`⚠️ External API returned ${response.status}, returning error`);
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

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
        "X-Cache": "MISS"
      }
    });

  } catch (error) {
    console.error("❌ Chat API proxy error:", error);
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
