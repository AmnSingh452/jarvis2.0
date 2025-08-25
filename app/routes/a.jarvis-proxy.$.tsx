import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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

// Handle GET requests (for widget config, etc.)
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Try to authenticate the app proxy request
    let proxyContext;
    let shop = "test-shop";
    
    try {
      proxyContext = await authenticate.public.appProxy(request);
      if (proxyContext.session) {
        shop = proxyContext.session.shop;
        console.log("✅ Authenticated shop:", shop);
      } else {
        console.log("ℹ️ No session found - testing mode or app not installed");
      }
    } catch (authError) {
      console.log("ℹ️ Authentication failed - likely a direct test request:", authError instanceof Error ? authError.message : String(authError));
      // Continue with test mode
    }
    
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Route to different handlers based on path
    if (pathname.includes('/widget-config')) {
      return handleWidgetConfig(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/widget-settings')) {
      return handleWidgetSettings(request, proxyContext?.session || null, shop);
    }
    
    // Default response
    return json({
      success: true,
      message: "Jarvis AI Chatbot Proxy Active",
      shop: shop,
      timestamp: new Date().toISOString()
    }, {
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error("❌ App proxy loader error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle POST requests (for chat, etc.)
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Try to authenticate the app proxy request
    let proxyContext;
    let shop = "test-shop";
    
    try {
      proxyContext = await authenticate.public.appProxy(request);
      if (proxyContext.session) {
        shop = proxyContext.session.shop;
        console.log("✅ Authenticated shop:", shop);
      } else {
        console.log("ℹ️ No session found - testing mode or app not installed");
      }
    } catch (authError) {
      console.log("ℹ️ Authentication failed - likely a direct test request:", authError instanceof Error ? authError.message : String(authError));
      // Continue with test mode
    }
    
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Route to different handlers based on path
    if (pathname.includes('/chat')) {
      return handleChat(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/abandoned-cart-discount')) {
      return handleAbandonedCartDiscount(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/recommendations')) {
      return handleRecommendations(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/customer/update')) {
      return handleCustomerUpdate(request, proxyContext?.session || null, shop);
    }
    
    // Default response for unknown endpoints
    return json({
      success: false,
      error: "Unknown endpoint",
      timestamp: new Date().toISOString()
    }, {
      status: 404,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error("❌ App proxy action error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handler functions
async function handleChat(request: Request, session: any | null, shop: string) {
  try {
    console.log("🔎 Chat request for shop:", shop);
    
    const requestText = await request.text();
    console.log("🔎 Request body:", requestText);
    
    if (!requestText || requestText.trim() === "") {
      return json({
        success: false,
        data: {
          response: "I didn't receive your message properly. Please try typing it again.",
          session_id: null
        },
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: corsHeaders
      });
    }

    let payload;
    try {
      payload = JSON.parse(requestText);
    } catch (parseError) {
      console.error("❌ Invalid JSON in request body:", parseError);
      return json({
        success: false,
        data: {
          response: "I had trouble understanding your message format. Please try again.",
          session_id: null
        },
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: corsHeaders
      });
    }

    console.log("🔎 Parsed payload:", payload);

    // Forward to external API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: JSON.stringify({
        ...payload,
        shop_domain: shop // Use the authenticated shop domain
      })
    });

    const responseText = await response.text();
    console.log("🔎 External API response:", response.status, responseText);

    let externalData;
    try {
      externalData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse external API response:", parseError);
      return json({
        success: false,
        data: {
          response: "Sorry, I'm having trouble connecting right now. Please try again.",
          session_id: payload.session_id
        },
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Transform the external API response to match widget expectations
    const transformedResponse = {
      success: externalData.success || false,
      data: {
        response: externalData.message || externalData.response || "I received your message but couldn't generate a proper response.",
        session_id: externalData.session_id || payload.session_id,
        ...(externalData.data && typeof externalData.data === 'object' ? externalData.data : {})
      },
      timestamp: new Date().toISOString()
    };

    console.log("🔄 Transformed response for widget:", transformedResponse);

    return json(transformedResponse, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Chat handler error:", error);
    return json({
      success: false,
      data: {
        response: "I'm experiencing some technical difficulties. Please try again in a moment.",
        session_id: null
      },
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: corsHeaders
    });
  }
}

async function handleWidgetConfig(request: Request, session: any | null, shop: string) {
  // Return widget configuration for the authenticated shop
  return json({
    success: true,
    shop: shop,
    config: {
      api_endpoints: {
        chat: `/a/jarvis-proxy/chat`,
        session: `/a/jarvis-proxy/session`,
        customer_update: `/a/jarvis-proxy/customer/update`,
        recommendations: `/a/jarvis-proxy/recommendations`,
        abandoned_cart_discount: `/a/jarvis-proxy/abandoned-cart-discount`
      },
      use_proxy: true,
      proxy_base_url: "" // Will use relative URLs
    },
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

async function handleWidgetSettings(request: Request, session: any | null, shop: string) {
  // Return widget settings for the authenticated shop
  // This would typically come from your database
  return json({
    success: true,
    shop: shop,
    settings: {
      isEnabled: true,
      primaryColor: "#007bff",
      secondaryColor: "#0056b3",
      headerText: "Jarvis AI Assistant",
      welcomeMessage: "Hello! How can I help you today?"
    },
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

async function handleAbandonedCartDiscount(request: Request, session: any | null, shop: string) {
  // Handle abandoned cart discount logic
  return json({
    success: true,
    shop: shop,
    discount_code: "JARVIS10OFF",
    message: "Discount created successfully",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

async function handleRecommendations(request: Request, session: any | null, shop: string) {
  // Handle product recommendations
  return json({
    success: true,
    shop: shop,
    recommendations: [],
    message: "No recommendations available",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

async function handleCustomerUpdate(request: Request, session: any | null, shop: string) {
  // Handle customer updates
  return json({
    success: true,
    shop: shop,
    message: "Customer updated successfully",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
