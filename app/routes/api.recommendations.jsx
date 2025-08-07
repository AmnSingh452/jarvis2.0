import { json } from "@remix-run/node";

// Simple in-memory cache to reduce API calls
const recommendationsCache = new Map();
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

// Handle POST requests for recommendations with retry logic
export async function action({ request }) {
  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    // Create cache key from request body
    const cacheKey = Buffer.from(body).toString('base64').slice(0, 50);
    const now = Date.now();
    
    // Check cache first
    if (recommendationsCache.has(cacheKey)) {
      const cached = recommendationsCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL) {
        console.log("📋 Returning cached recommendations");
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
        recommendationsCache.delete(cacheKey);
      }
    }
    
    console.log("🔍 Recommendations API request received");

    // Retry logic for rate limiting
    let retryCount = 0;
    const maxRetries = 2;
    let response;

    while (retryCount <= maxRetries) {
      try {
        response = await fetch("https://cartrecover-bot.onrender.com/api/recommendations", {
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

    const responseData = await response.text();
    
    // Cache successful responses
    if (response.status === 200) {
      console.log("✅ Recommendations API responded successfully");
      recommendationsCache.set(cacheKey, {
        data: responseData,
        timestamp: now
      });
      
      // Clean old cache entries periodically
      if (recommendationsCache.size > 100) {
        const entries = Array.from(recommendationsCache.entries());
        entries.forEach(([key, value]) => {
          if (now - value.timestamp > CACHE_TTL) {
            recommendationsCache.delete(key);
          }
        });
      }
    } else if (response.status === 429) {
      console.log("⚠️ Rate limited after retries, using smart fallback");
      
      // Parse request body for fallback context
      let shop_domain = "default";
      let product_ids = [];
      
      if (body) {
        try {
          const parsed = JSON.parse(body);
          shop_domain = parsed.shop_domain || "default";
          product_ids = parsed.product_ids || [];
        } catch (e) {
          console.log("⚠️ Could not parse request body for fallback");
        }
      }
      
      // Use smart fallback recommendation system (no auth needed)
      const fallbackData = await getFallbackRecommendations(shop_domain, null, product_ids);
      
      // Cache the fallback response for 2 minutes (shorter than normal cache)
      recommendationsCache.set(cacheKey, {
        data: JSON.stringify(fallbackData),
        timestamp: now
      });
      
      return new Response(JSON.stringify(fallbackData), {
        status: 200, // Return 200 with fallback data
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "SMART_FALLBACK"
        }
      });
    }

  } catch (error) {
    console.error("❌ Critical error in recommendations API:", error);
    
    // Parse request body for fallback context
    let shop_domain = "default";
    let product_ids = [];
    
    try {
      const body = await request.text();
      if (body) {
        const parsed = JSON.parse(body);
        shop_domain = parsed.shop_domain || "default";
        product_ids = parsed.product_ids || [];
      }
    } catch (e) {
      console.log("⚠️ Could not parse request body during error recovery");
    }
    
    // Use smart fallback recommendation system (no auth needed)
    const fallbackData = await getFallbackRecommendations(shop_domain, null, product_ids);
    
    return new Response(JSON.stringify(fallbackData), {
      status: 200, // Always return 200 with fallback data
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "ERROR_FALLBACK"
      }
    });
  }
}

// Handle GET requests
export async function loader({ request }) {
  return json({
    success: true,
    message: "Recommendations API endpoint is active",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
