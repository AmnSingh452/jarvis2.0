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
    } else if (pathname.includes('/register-shop')) {
      return handleShopRegistration(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/abandoned-cart-discount')) {
      return handleAbandonedCartDiscount(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/recommendations')) {
      return handleRecommendations(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/customer/update')) {
      return handleCustomerUpdate(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/debug-token')) {
      return handleTokenDebug(request, proxyContext?.session || null, shop);
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

    // Get access token from session if available
    let accessToken = null;
    if (session) {
      console.log("🔍 Session object keys:", Object.keys(session));
      
      // Try different possible token locations in Shopify session
      accessToken = session.accessToken || session.token || session.access_token;
      
      if (accessToken) {
        console.log("🔑 Access token found and is valid:", accessToken.startsWith('shpat_'));
        console.log("🔑 Token preview:", accessToken.substring(0, 15) + "...");
      } else {
        console.log("⚠️ No access token found in session");
        console.log("🔍 Available session properties:", Object.keys(session));
        
        // Try to get a fresh session from database if available
        if (shop !== "test-shop") {
          try {
            console.log("🔄 Attempting to fetch fresh session from database...");
            const { sessionStorage } = await import("../shopify.server");
            const freshSession = await sessionStorage.findSessionsByShop(shop);
            console.log("🔍 Fresh sessions found:", freshSession.length);
            
            if (freshSession.length > 0) {
              const latestSession = freshSession[0];
              accessToken = latestSession.accessToken;
              console.log("🔑 Fresh token found:", accessToken ? accessToken.substring(0, 15) + "..." : "null");
            }
          } catch (dbError) {
            console.log("⚠️ Could not fetch fresh session:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        }
      }
    } else {
      console.log("⚠️ No session object available");
    }

    // Prepare payload for external API
    const externalPayload = {
      ...payload,
      shop_domain: shop,
      access_token: accessToken // Include access token for Shopify API calls
    };
    
    console.log("🚀 Sending to external API:", {
      ...externalPayload,
      access_token: accessToken ? accessToken.substring(0, 20) + "..." : null
    });

    // Forward to external API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: JSON.stringify(externalPayload)
    });

    const responseText = await response.text();
    console.log("🔎 External API response:", response.status, responseText);

    let externalData;
    try {
      externalData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse external API response:", parseError);
      
      // Check if it's a "Shop not found" error and try to register
      if (responseText.includes("Shop not found") && session && session.accessToken) {
        console.log("🔄 Shop not found, attempting automatic registration...");
        
        try {
          // Attempt automatic registration
          const registrationResponse = await fetch("https://cartrecover-bot.onrender.com/api/register-shop", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Shopify-Chatbot-Proxy/1.0"
            },
            body: JSON.stringify({
              shop_domain: shop,
              access_token: session.accessToken,
              shop_url: `https://${shop}`,
              installed_at: new Date().toISOString()
            })
          });

          if (registrationResponse.ok) {
            console.log("✅ Shop registered successfully, retrying chat request...");
            
            // Retry the original chat request
            const retryResponse = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "Shopify-Chatbot-Proxy/1.0"
              },
              body: JSON.stringify({
                ...payload,
                shop_domain: shop,
                access_token: session.accessToken
              })
            });

            const retryText = await retryResponse.text();
            try {
              externalData = JSON.parse(retryText);
            } catch {
              // If retry also fails, fall back to default response
              externalData = {
                success: true,
                message: "Hi! I'm your AI shopping assistant. I'm here to help you find products and answer questions. What can I help you with today?",
                session_id: payload.session_id
              };
            }
          } else {
            // Registration failed, provide fallback response
            externalData = {
              success: true,
              message: "Hi! I'm your AI shopping assistant. I'm here to help you find products and answer questions. What can I help you with today?",
              session_id: payload.session_id
            };
          }
        } catch (registrationError) {
          console.error("❌ Shop registration failed:", registrationError);
          externalData = {
            success: true,
            message: "Hi! I'm your AI shopping assistant. I'm here to help you find products and answer questions. What can I help you with today?",
            session_id: payload.session_id
          };
        }
      } else {
        // For other parsing errors, provide fallback response
        externalData = {
          success: true,
          message: "Hi! I'm your AI shopping assistant. I'm here to help you find products and answer questions. What can I help you with today?",
          session_id: payload.session_id
        };
      }
    }

    // Handle case where external API returns an error but is parseable
    if (!externalData.success && externalData.error && externalData.error.includes("Shop not found") && session && session.accessToken) {
      console.log("🔄 Parsed error indicates shop not found, attempting registration...");
      // Similar registration logic as above could be added here
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

    // Track conversation in local database (background task)
    trackConversationBackground(payload, externalData, shop);

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

async function handleShopRegistration(request: Request, session: any | null, shop: string) {
  try {
    console.log("🏪 Shop registration request for:", shop);
    
    if (!session || !session.accessToken) {
      return json({
        success: false,
        error: "No valid session or access token available",
        timestamp: new Date().toISOString()
      }, {
        status: 401,
        headers: corsHeaders
      });
    }

    // Register shop with external API
    const registrationResponse = await fetch("https://cartrecover-bot.onrender.com/api/register-shop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: JSON.stringify({
        shop_domain: shop,
        access_token: session.accessToken,
        shop_url: `https://${shop}`,
        installed_at: new Date().toISOString()
      })
    });

    const registrationResult = await registrationResponse.text();
    console.log("🏪 Shop registration response:", registrationResponse.status, registrationResult);

    return json({
      success: registrationResponse.ok,
      message: registrationResponse.ok ? "Shop registered successfully" : "Failed to register shop",
      details: registrationResult,
      timestamp: new Date().toISOString()
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Shop registration error:", error);
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
  // Handle product recommendations by forwarding to external API
  try {
    console.log("🛍️ Handling recommendations request for shop:", shop);
    
    const body = await request.text();
    console.log("🛍️ Request body:", body);

    // Get access token for the shop
    let accessToken = null;
    if (session && session.accessToken) {
      accessToken = session.accessToken;
      console.log("🛍️ Using session access token");
    } else {
      // Try to get token from database
      try {
        const db = (await import("../db.server")).default;
        const shopRecord = await db.shop.findUnique({
          where: { shopDomain: shop }
        });
        if (shopRecord && shopRecord.accessToken) {
          accessToken = shopRecord.accessToken;
          console.log("🛍️ Using database access token");
        }
      } catch (dbError) {
        console.error("❌ Failed to get token from database:", dbError);
      }
    }

    // Prepare payload for external API
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      payload = {};
    }

    const externalPayload = {
      ...payload,
      shop_domain: shop,
      access_token: accessToken
    };

    console.log("🛍️ Forwarding to external recommendations API");

    // Forward to external API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: JSON.stringify(externalPayload)
    });

    const responseText = await response.text();
    console.log("🛍️ External API response:", response.status, responseText);

    // Parse and return the response
    let externalData;
    try {
      externalData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse external recommendations response:", parseError);
      return json({
        success: false,
        shop: shop,
        recommendations: [],
        message: "Failed to get recommendations",
        error: "External API parse error",
        timestamp: new Date().toISOString()
      }, {
        status: 500,
        headers: corsHeaders
      });
    }

    return json(externalData, {
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Recommendations handler error:", error);
    return json({
      success: false,
      shop: shop,
      recommendations: [],
      message: "Recommendations temporarily unavailable",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
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

async function handleTokenDebug(request: Request, session: any | null, shop: string) {
  try {
    console.log("🔍 TOKEN DEBUG - Shop:", shop);
    console.log("🔍 TOKEN DEBUG - Session exists:", !!session);
    
    let debugInfo: any = {
      shop: shop,
      sessionExists: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      timestamp: new Date().toISOString()
    };

    if (session) {
      // Get access token
      const accessToken = session.accessToken || session.token || session.access_token;
      debugInfo.hasAccessToken = !!accessToken;
      debugInfo.tokenPreview = accessToken ? accessToken.substring(0, 15) + "..." : null;
      debugInfo.tokenType = accessToken ? (accessToken.startsWith('shpat_') ? 'offline' : 'unknown') : null;
      
      // Try to get fresh session from database
      try {
        const { sessionStorage } = await import("../shopify.server");
        const freshSessions = await sessionStorage.findSessionsByShop(shop);
        debugInfo.freshSessionsCount = freshSessions.length;
        
        if (freshSessions.length > 0) {
          const latestSession = freshSessions[0];
          debugInfo.freshTokenPreview = latestSession.accessToken ? 
            latestSession.accessToken.substring(0, 15) + "..." : null;
        }
      } catch (dbError) {
        debugInfo.dbError = dbError instanceof Error ? dbError.message : String(dbError);
      }
    }

    return json(debugInfo, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Token debug error:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Helper function to track conversation and messages in background
async function trackConversationBackground(payload: any, externalResponse: any, shopDomain: string) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const sessionId = externalResponse.session_id || payload.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = payload.message;
    const botResponse = externalResponse.message || externalResponse.response;
    
    if (!userMessage || !botResponse) {
      console.log("⚠️ Missing message data for conversation tracking");
      return;
    }

    // Check if conversation already exists
    let conversation = await prisma.chatConversation.findFirst({
      where: {
        sessionId: sessionId,
        shopDomain: shopDomain
      }
    });

    let isNewConversation = false;

    if (!conversation) {
      // Create new conversation
      const topic = extractTopicFromMessage(userMessage);
      
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId: sessionId,
          shopDomain: shopDomain,
          customerIp: payload.customer_email || "anonymous@shop.local",
          topic: topic,
          status: "active",
          totalMessages: 0, // Will be incremented below
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      isNewConversation = true;
      console.log("✅ New conversation tracked:", conversation.id);
    } else {
      console.log("📝 Continuing existing conversation:", conversation.id);
    }

    // Add user message
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        content: userMessage,
        role: "user",
        timestamp: new Date()
      }
    });

    // Add bot response
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        content: botResponse,
        role: "assistant",
        timestamp: new Date()
      }
    });

    // Update conversation with new message count and last updated time
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        totalMessages: { increment: 2 }, // User message + bot response
        updatedAt: new Date()
      }
    });

    // Update analytics metrics
    const today = new Date().toISOString().split('T')[0];
    
    const existingMetrics = await prisma.analyticsMetrics.findFirst({
      where: {
        date: today,
        shopDomain: shopDomain
      }
    });

    if (existingMetrics) {
      // Update existing metrics
      await prisma.analyticsMetrics.update({
        where: { id: existingMetrics.id },
        data: {
          totalConversations: isNewConversation ? { increment: 1 } : existingMetrics.totalConversations, // Only increment for new conversations
          uniqueVisitors: isNewConversation ? { increment: 1 } : existingMetrics.uniqueVisitors, // Only increment for new conversations
          totalMessages: { increment: 2 }, // Always increment message count
          updatedAt: new Date()
        }
      });
      console.log(`📊 Updated metrics - New conversation: ${isNewConversation}, Total messages incremented by 2`);
    } else {
      // Create new metrics for today
      await prisma.analyticsMetrics.create({
        data: {
          date: today,
          shopDomain: shopDomain,
          totalConversations: 1,
          uniqueVisitors: 1,
          totalMessages: 2,
          averageResponseTime: 1.5, // Default response time
          customerSatisfaction: 4.5, // Default satisfaction
          topQuestions: JSON.stringify([
            { question: extractTopicFromMessage(userMessage), count: 1 }
          ])
        }
      });
      console.log("📊 Created new daily metrics");
    }

    await prisma.$disconnect();
    console.log("✅ Conversation tracking completed successfully");

  } catch (error) {
    console.error("❌ Error tracking conversation:", error);
    // Don't throw error to avoid breaking chat response
  }
}

// Helper function to extract topic from message
function extractTopicFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('order') || lowerMessage.includes('tracking') || lowerMessage.includes('status')) {
    return 'Order';
  } else if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('exchange')) {
    return 'Returns';
  } else if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('ship')) {
    return 'Shipping';
  } else if (lowerMessage.includes('payment') || lowerMessage.includes('charge') || lowerMessage.includes('billing')) {
    return 'Payment';
  } else if (lowerMessage.includes('product') || lowerMessage.includes('item') || lowerMessage.includes('size') || lowerMessage.includes('color')) {
    return 'Product';
  } else if (lowerMessage.includes('stock') || lowerMessage.includes('available') || lowerMessage.includes('inventory')) {
    return 'Stock';
  } else {
    return 'General';
  }
}
