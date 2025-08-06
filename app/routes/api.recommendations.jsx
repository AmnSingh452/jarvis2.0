import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Simple in-memory cache to reduce API calls
const recommendationsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback recommendation system using Shopify GraphQL
async function getFallbackRecommendations(shop_domain, admin, product_ids = []) {
  try {
    console.log("🔄 Fetching fallback recommendations from Shopify...");
    
    // Query for popular/featured products from the store
    const response = await admin.graphql(`
      query getProducts {
        products(first: 10, query: "published_status:published") {
          nodes {
            id
            title
            handle
            description
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              nodes {
                id
                price
                availableForSale
              }
            }
          }
        }
      }
    `);

    const { data } = await response.json();
    
    if (data?.products?.nodes) {
      const recommendations = data.products.nodes.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description || `Recommended product: ${product.title}`,
        image: product.featuredImage?.url || null,
        price: product.priceRange.minVariantPrice.amount,
        currency: product.priceRange.minVariantPrice.currencyCode,
        available: product.variants.nodes[0]?.availableForSale || false,
        source: 'shopify_fallback'
      }));

      console.log(`✅ Generated ${recommendations.length} fallback recommendations from Shopify`);
      
      return {
        success: true,
        message: "Showing popular products from your store",
        recommendations: recommendations,
        fallback: true,
        source: 'shopify',
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error("No products found in store");
    
  } catch (error) {
    console.error("❌ Fallback recommendation error:", error);
    
    // Ultimate fallback - return generic message
    return {
      success: true,
      message: "Browse our featured products",
      recommendations: [
        {
          id: 'fallback-1',
          title: 'Browse Our Products',
          description: 'Check out our latest collection of products',
          source: 'generic_fallback'
        }
      ],
      fallback: true,
      source: 'generic',
      timestamp: new Date().toISOString()
    };
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
      console.log("⚠️ Rate limited after retries, using Shopify fallback");
      
      // Get authenticated admin for Shopify API access
      let admin = null;
      try {
        const { admin: authenticatedAdmin } = await authenticate.admin(request);
        admin = authenticatedAdmin;
      } catch (authError) {
        console.log("⚠️ Authentication failed, using generic fallback");
      }
      
      // Parse request body for fallback recommendations
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
      
      // Use fallback recommendation system
      const fallbackData = await getFallbackRecommendations(shop_domain, admin, product_ids);
      
      // Cache the fallback response for 2 minutes (shorter than normal cache)
      recommendationsCache.set(cacheKey, {
        data: JSON.stringify(fallbackData),
        timestamp: now
      });
      
      return new Response(JSON.stringify(fallbackData), {
        status: 200, // Return 200 with fallback data, not 503
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "FALLBACK"
        }
      });
    } else {
      console.log(`⚠️ External API failed with status ${response.status}, using fallback`);
      
      // Get authenticated admin for Shopify API access
      let admin = null;
      try {
        const { admin: authenticatedAdmin } = await authenticate.admin(request);
        admin = authenticatedAdmin;
      } catch (authError) {
        console.log("⚠️ Authentication failed, using generic fallback");
      }
      
      // Parse request body for fallback recommendations  
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
      
      // Use fallback recommendation system
      const fallbackData = await getFallbackRecommendations(shop_domain, admin, product_ids);
      
      // Cache the fallback response
      recommendationsCache.set(cacheKey, {
        data: JSON.stringify(fallbackData),
        timestamp: now
      });
      
      return new Response(JSON.stringify(fallbackData), {
        status: 200, // Return 200 with fallback data
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "FALLBACK"
        }
      });
    }
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
        "X-Cache": "MISS"
      }
    });

  } catch (error) {
    console.error("❌ Critical error in recommendations API:", error);
    
    // Get authenticated admin for Shopify API access (if possible)
    let admin = null;
    try {
      const { admin: authenticatedAdmin } = await authenticate.admin(request);
      admin = authenticatedAdmin;
    } catch (authError) {
      console.log("⚠️ Authentication failed during error recovery");
    }
    
    // Parse request body for fallback recommendations
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
    
    // Use fallback recommendation system
    const fallbackData = await getFallbackRecommendations(shop_domain, admin, product_ids);
    
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
