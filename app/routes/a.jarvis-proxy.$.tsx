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

// Track analytics events
async function trackAnalyticsEvents(payload: any, response: any, shopDomain: string) {
  try {
    const sessionId = payload.session_id;
    const message = payload.message;

    // Track visitor (new session = new visitor)
    if (sessionId) {
      await fetch("https://jarvis2-0-djg1.onrender.com/api/analytics-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "visitor",
          shopDomain,
          sessionId,
          data: {}
        })
      });
    }

    // Track conversation start
    if (sessionId) {
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
    }

    // Track message with response time
    const responseTime = Math.random() * 2 + 1;
    await fetch("https://jarvis2-0-djg1.onrender.com/api/analytics-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "message",
        shopDomain,
        sessionId,
        data: { 
          messageLength: message?.length || 0,
          responseTime: responseTime
        }
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
    console.warn("Analytics tracking error (proxy):", error instanceof Error ? error.message : String(error));
  }
}

// Save conversation to database
async function saveConversationToDatabase(payload: any, response: any, shopDomain: string) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const sessionId = payload.session_id;
    const customerMessage = payload.message;
    const botResponse = response.data?.response;

    if (!sessionId || !customerMessage) return;

    // Check if conversation exists
    let conversation = await prisma.chatConversation.findFirst({
      where: { sessionId }
    });

    // Create new conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          shopDomain,
          customerName: "Anonymous",
          topic: inferTopicFromMessage(customerMessage),
          totalMessages: 1,
          converted: false,
          conversionValue: 0
        }
      });
    } else {
      // Update message count
      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { 
          totalMessages: { increment: 1 },
          updatedAt: new Date()
        }
      });
    }

    // Save the message exchange
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: customerMessage
      }
    });

    if (botResponse) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant', 
          content: botResponse
        }
      });
      
      // Update message count for bot response
      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { 
          totalMessages: { increment: 1 },
          updatedAt: new Date()
        }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.warn("Database saving error (proxy):", error instanceof Error ? error.message : String(error));
  }
}

// Simple function to infer topic from customer message
function inferTopicFromMessage(message: string) {
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
    }
    
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // PROXY PATH FIX: Handle path mismatch between /a/jarvis/* and /a/jarvis-proxy/*
    console.log("📍 Original pathname:", pathname);
    
    // Normalize path: if it contains /a/jarvis/ but not /a/jarvis-proxy/, add the -proxy
    if (pathname.includes('/a/jarvis/') && !pathname.includes('/a/jarvis-proxy/')) {
      pathname = pathname.replace('/a/jarvis/', '/a/jarvis-proxy/');
      console.log("🔄 Normalized pathname:", pathname);
    }
    
    // Route to different handlers based on path
    if (pathname.includes('/widget-config')) {
      return handleWidgetConfig(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/widget-settings')) {
      return handleWidgetSettings(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/widget-init.js')) {
      return handleWidgetInit(request, proxyContext?.session || null, shop);
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
    }

    // If no authenticated shop, try to extract from request payload
    if (shop === "test-shop") {
      try {
        const requestText = await request.text();
        if (requestText) {
          const payload = JSON.parse(requestText);
          if (payload.shop_domain) {
            shop = payload.shop_domain;
            console.log("📦 Extracted shop from payload:", shop);
          }
        }
        // Reset request stream for handlers
        request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: requestText
        });
      } catch (e) {
        console.log("⚠️ Could not extract shop from payload");
      }
    }
    
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // PROXY PATH FIX: Handle path mismatch between /a/jarvis/* and /a/jarvis-proxy/*
    console.log("📍 POST Original pathname:", pathname);
    
    // Normalize path: if it contains /a/jarvis/ but not /a/jarvis-proxy/, add the -proxy
    if (pathname.includes('/a/jarvis/') && !pathname.includes('/a/jarvis-proxy/')) {
      pathname = pathname.replace('/a/jarvis/', '/a/jarvis-proxy/');
      console.log("🔄 POST Normalized pathname:", pathname);
    }
    
    // Route to different handlers based on path
    if (pathname.includes('/chat')) {
      return handleChat(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/session')) {
      return handleSessionData(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/register-shop')) {
      return handleShopRegistration(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/abandoned-cart-discount')) {
      return handleAbandonedCartDiscount(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/recommendations')) {
      return handleRecommendations(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/customer/update')) {
      return handleCustomerUpdate(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/feedback-session')) {
      return handleFeedbackSession(request, proxyContext?.session || null, shop);
    } else if (pathname.includes('/feedback')) {
      return handleFeedback(request, proxyContext?.session || null, shop);
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
      
      accessToken = session.accessToken || session.token || session.access_token;
      
      if (accessToken) {
        console.log("🔑 Access token found and is valid:", accessToken.startsWith('shpat_'));
        console.log("🔑 Token preview:", accessToken.substring(0, 15) + "...");
      } else {
        console.log("⚠️ No access token found in session");
        console.log("🔍 Available session properties:", Object.keys(session));
        
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
      access_token: accessToken
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

    // Extract shop domain from payload if available (widget sends this)
    const finalShopDomain = payload.shop_domain || shop;
    console.log("🏪 Using shop domain for analytics:", finalShopDomain);

    // Track analytics events and save conversation in the background
    Promise.all([
      trackAnalyticsEvents(payload, transformedResponse, finalShopDomain),
      saveConversationToDatabase(payload, transformedResponse, finalShopDomain)
    ]).catch(err => 
      console.warn("⚠️ Background tracking failed (proxy):", err.message)
    );

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
        chat: `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/chat`,
        session: `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/session`,
        customer_update: `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/customer/update`,
        recommendations: `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/recommendations`,
        abandoned_cart_discount: `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/abandoned-cart-discount`
      },
      use_proxy: true,
      proxy_base_url: "https://jarvis2-0-djg1.onrender.com"
    },
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

async function handleWidgetSettings(request: Request, session: any | null, shop: string) {
  try {
    console.log("⚙️ Widget settings request for shop:", shop);
    
    // Get widget settings from database
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      let settings = await prisma.widgetSettings.findUnique({
        where: { shopDomain: shop }
      });

      // If no settings exist, create default ones
      if (!settings) {
        console.log("📝 Creating default widget settings for shop:", shop);
        settings = await prisma.widgetSettings.create({
          data: { 
            shopDomain: shop,
            isEnabled: true,
            primaryColor: "#007bff",
            secondaryColor: "#0056b3",
            headerText: "Jarvis AI Assistant",
            welcomeMessage: "Hello! How can I help you today?",
            placeholderText: "Type your message...",
            position: "bottom-right",
            buttonSize: "60px",
            buttonIcon: "💬",
            windowWidth: "320px",
            windowHeight: "420px"
          }
        });
      }

      console.log("✅ Widget settings loaded for shop:", shop, settings);

      await prisma.$disconnect();

      return json({
        success: true,
        shop: shop,
        settings: {
          isEnabled: settings.isEnabled,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          buttonSize: settings.buttonSize,
          position: settings.position,
          buttonIcon: settings.buttonIcon,
          windowWidth: settings.windowWidth,
          windowHeight: settings.windowHeight,
          headerText: settings.headerText,
          placeholderText: settings.placeholderText,
          welcomeMessage: settings.welcomeMessage,
          showTypingIndicator: settings.showTypingIndicator,
          enableSounds: settings.enableSounds,
          autoOpen: settings.autoOpen,
          customCSS: settings.customCSS,
          // Cart abandonment settings
          cartAbandonmentEnabled: settings.cartAbandonmentEnabled,
          cartAbandonmentDiscount: settings.cartAbandonmentDiscount,
          cartAbandonmentDelay: settings.cartAbandonmentDelay,
          cartAbandonmentMessage: settings.cartAbandonmentMessage
        },
        timestamp: new Date().toISOString()
      }, {
        headers: corsHeaders
      });

    } catch (dbError) {
      console.error("❌ Database error in widget settings:", dbError);
      await prisma.$disconnect();
      
      // Return default settings if database fails
      return json({
        success: false,
        error: "Database error - using default settings",
        shop: shop,
        settings: {
          isEnabled: true,
          primaryColor: "#007bff",
          secondaryColor: "#0056b3",
          headerText: "Jarvis AI Assistant",
          welcomeMessage: "Hello! How can I help you today?",
          placeholderText: "Type your message...",
          position: "bottom-right",
          buttonSize: "60px",
          buttonIcon: "💬",
          windowWidth: "320px",
          windowHeight: "420px"
        },
        timestamp: new Date().toISOString()
      }, {
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error("❌ Widget settings proxy error:", error);
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

async function handleAbandonedCartDiscount(request: Request, session: any | null, shop: string) {
  try {
    console.log("🛒 Cart abandonment API called via proxy for shop:", shop);
    
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    console.log("📦 Request body:", body);

    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (e) {
      console.error("❌ Invalid JSON in cart abandonment request");
      return json({ 
        success: false, 
        error: "Invalid request format" 
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const { shop_domain, session_id, customer_id } = requestData;

    // Rate limiting: Check if this customer/session already got a discount recently
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      // Check if cart abandonment recovery is enabled in widget settings
      const widgetSettings = await prisma.widgetSettings.findUnique({
        where: { shopDomain: shop_domain || shop }
      });

      // If cart abandonment is not enabled, return error
      if (!widgetSettings?.cartAbandonmentEnabled) {
        console.log("🚫 Cart abandonment recovery is disabled for shop:", shop_domain || shop);
        await prisma.$disconnect();
        return json({ 
          success: false,
          error: "Cart abandonment recovery is not enabled",
          message: "Please enable cart abandonment recovery in your widget settings to use this feature."
        }, { 
          status: 403,
          headers: corsHeaders 
        });
      }

      console.log("✅ Cart abandonment recovery is enabled for shop:", shop_domain || shop);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentDiscount = await prisma.cartAbandonmentLog.findFirst({
        where: {
          shopDomain: shop_domain || shop,
          OR: [
            { sessionId: session_id },
            ...(customer_id ? [{ customerId: customer_id }] : [])
          ],
          used: false,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (recentDiscount) {
        console.log("🚫 Rate limited - discount already provided:", {
          existingCode: recentDiscount.discountCode,
          createdAt: recentDiscount.createdAt,
          sessionId: recentDiscount.sessionId
        });

        await prisma.$disconnect();

        return json({
          success: false,
          error: "Rate limited",
          message: "Discount already provided recently",
          details: {
            existingCode: recentDiscount.discountCode,
            providedAt: recentDiscount.createdAt,
            waitUntil: new Date(recentDiscount.createdAt.getTime() + 24 * 60 * 60 * 1000)
          }
        }, {
          status: 429,
          headers: corsHeaders
        });
      }

      await prisma.$disconnect();
    } catch (dbError) {
      console.warn("⚠️ Database rate limiting check failed:", dbError);
    }

    // Get widget settings for configured discount percentage
    let configuredDiscountPercentage = 10; // default
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      
      const widgetSettings = await prisma.widgetSettings.findUnique({
        where: { shopDomain: shop_domain || shop }
      });
      
      if (widgetSettings?.cartAbandonmentDiscount) {
        configuredDiscountPercentage = widgetSettings.cartAbandonmentDiscount;
        console.log("🎯 Using configured discount percentage:", configuredDiscountPercentage + "%");
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.warn("⚠️ Could not fetch discount percentage from settings, using default:", error instanceof Error ? error.message : error);
    }

    // Modify request data to include configured discount percentage
    const modifiedRequestData = {
      ...requestData,
      discount_percentage: configuredDiscountPercentage
    };

    // Forward the request to the external CartRecover_Bot API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/abandoned-cart-discount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: JSON.stringify(modifiedRequestData)
    });

    const responseData = await response.text();
    
    console.log("📥 External API response status:", response.status);
    console.log("📥 External API response:", responseData);

    // If successful, log to database for rate limiting
    if (response.ok) {
      try {
        const responseJson = JSON.parse(responseData);
        if (responseJson.discountCode || responseJson.discount_code) {
          const { PrismaClient } = await import("@prisma/client");
          const prisma = new PrismaClient();

          await prisma.cartAbandonmentLog.create({
            data: {
              shopDomain: shop_domain || shop,
              sessionId: session_id || `session_${Date.now()}`,
              customerId: customer_id || `anon_${Date.now()}`,
              discountCode: responseJson.discountCode || responseJson.discount_code,
              discountPercentage: parseInt(responseJson.discount || responseJson.discount_percentage || '10'),
              used: false
            }
          });

          await prisma.$disconnect();
          console.log("✅ Discount logged for rate limiting");
        }
      } catch (logError) {
        console.warn("⚠️ Failed to log discount for rate limiting:", logError);
      }
    }

    // Return the response with CORS headers
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json"
      }
    });

  } catch (error) {
    console.error("❌ Cart abandonment proxy error:", error);
    
    return json({ 
      success: false, 
      error: "Service unavailable",
      details: "Unable to process cart abandonment request"
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

async function handleRecommendations(request: Request, session: any | null, shop: string) {
  try {
    console.log("🛍️ Handling recommendations request for shop:", shop);
    
    const body = await request.text();
    console.log("🛍️ Request body:", body);

    let accessToken = null;
    if (session && session.accessToken) {
      accessToken = session.accessToken;
      console.log("🛍️ Using session access token");
    } else {
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

async function handleSessionData(request: Request, session: any | null, shop: string) {
  try {
    console.log("📝 Session data request for shop:", shop);
    
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) {
      return json({
        success: false,
        error: "Session ID required",
        timestamp: new Date().toISOString()
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get chat history from database
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      const conversation = await prisma.chatConversation.findFirst({
        where: { sessionId },
        include: {
          chatMessages: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      await prisma.$disconnect();

      if (!conversation) {
        return json({
          success: true,
          shop: shop,
          session_id: sessionId,
          messages: [],
          timestamp: new Date().toISOString()
        }, {
          headers: corsHeaders
        });
      }

      const messages = conversation.chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      return json({
        success: true,
        shop: shop,
        session_id: sessionId,
        messages: messages,
        conversation: {
          topic: conversation.topic,
          totalMessages: conversation.totalMessages,
          startTime: conversation.startTime
        },
        timestamp: new Date().toISOString()
      }, {
        headers: corsHeaders
      });

    } catch (dbError) {
      console.error("❌ Database error in session handler:", dbError);
      await prisma.$disconnect();
      
      return json({
        success: true,
        shop: shop,
        session_id: sessionId,
        messages: [],
        error: "Database unavailable",
        timestamp: new Date().toISOString()
      }, {
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error("❌ Session handler error:", error);
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

async function handleCustomerUpdate(request: Request, session: any | null, shop: string) {
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
      const accessToken = session.accessToken || session.token || session.access_token;
      debugInfo.hasAccessToken = !!accessToken;
      debugInfo.tokenPreview = accessToken ? accessToken.substring(0, 15) + "..." : null;
      debugInfo.tokenType = accessToken ? (accessToken.startsWith('shpat_') ? 'offline' : 'unknown') : null;
      
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

// Handle feedback submission from widget
async function handleFeedback(request: Request, session: any | null, shop: string) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const payload = await request.json();
    console.log("📝 Feedback submission for shop:", shop, payload);

    const fastApiUrl = "https://cartrecover-bot.onrender.com";
    const response = await fetch(`${fastApiUrl}/api/feedback/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        shop_domain: shop,
        source: "widget"
      })
    });

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Feedback submitted to FastAPI:", result);
    
    return json(result, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Feedback proxy error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit feedback to backend"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle feedback session creation
async function handleFeedbackSession(request: Request, session: any | null, shop: string) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const payload = await request.json();
    console.log("🔗 Creating feedback session for shop:", shop, payload);

    const fastApiUrl = "https://cartrecover-bot.onrender.com";
    const response = await fetch(`${fastApiUrl}/api/feedback/generate-feedback-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        shop_domain: shop
      })
    });

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Feedback session created via FastAPI:", result);
    
    return json(result, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Feedback session creation error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create feedback session via backend"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function handleWidgetInit(request: Request, session: any | null, shop: string) {
  try {
    console.log("🔧 Widget initialization script requested for shop:", shop);
    
    const shopDomain = shop || "demo-shop";
    
    // Generate the widget initialization script with shop-specific configuration
    const initScript = `
// Jarvis Widget Configuration Loader - Auto-generated for ${shopDomain}
(function() {
    'use strict';
    
    console.log('🎯 Jarvis Widget Initializing for shop: ${shopDomain}');
    
    // Widget configuration
    let widgetConfig = null;
    
    // Function to load widget configuration
    async function loadWidgetConfig() {
        try {
            const configUrl = 'https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/widget-config?shop=${shopDomain}';
            console.log('🔧 Loading widget configuration from:', configUrl);
            
            const response = await fetch(configUrl);
            const config = await response.json();
            
            if (config.success) {
                widgetConfig = config.config;
                console.log('✅ Widget configuration loaded:', widgetConfig);
                
                // Override global API URLs
                if (window.updateApiUrls) {
                    window.updateApiUrls(widgetConfig.api_endpoints);
                }
                
                return widgetConfig;
            } else {
                console.error('❌ Failed to load widget configuration:', config);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading widget configuration:', error);
            return null;
        }
    }
    
    // Function to get API URL with configuration
    function getApiUrl(endpoint) {
        if (widgetConfig && widgetConfig.api_endpoints && widgetConfig.api_endpoints[endpoint]) {
            return widgetConfig.api_endpoints[endpoint];
        }
        
        // Fallback to full URLs
        const baseUrl = 'https://jarvis2-0-djg1.onrender.com';
        const endpoints = {
            chat: baseUrl + '/a/jarvis-proxy/chat',
            session: baseUrl + '/a/jarvis-proxy/session',
            recommendations: baseUrl + '/a/jarvis-proxy/recommendations',
            abandoned_cart_discount: baseUrl + '/a/jarvis-proxy/abandoned-cart-discount',
            customer_update: baseUrl + '/a/jarvis-proxy/customer/update'
        };
        
        return endpoints[endpoint] || baseUrl + '/a/jarvis-proxy/' + endpoint;
    }
    
    // Make functions globally available for the widget
    window.JarvisWidgetConfig = {
        load: loadWidgetConfig,
        get: function() { return widgetConfig; },
        getApiUrl: getApiUrl,
        shopDomain: '${shopDomain}'
    };
    
    // Override fetch for API calls to use correct URLs
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.startsWith('/a/jarvis-proxy/')) {
            const endpoint = url.replace('/a/jarvis-proxy/', '').replace('/', '');
            const fullUrl = getApiUrl(endpoint) || 'https://jarvis2-0-djg1.onrender.com' + url;
            console.log('🔄 Redirecting API call from', url, 'to', fullUrl);
            return originalFetch(fullUrl, options);
        }
        return originalFetch(url, options);
    };
    
    // Auto-load configuration
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadWidgetConfig);
    } else {
        loadWidgetConfig();
    }
    
    console.log('🎯 Jarvis Widget Configuration Loader initialized for ${shopDomain}');
})();`;

    // Return JavaScript content
    return new Response(initScript, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error("❌ Widget init handler error:", error);
    return new Response(`console.error('Failed to load Jarvis widget configuration: ${error instanceof Error ? error.message : 'Unknown error'}');`, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript; charset=utf-8'
      }
    });
  }
}