import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    console.log("🛒 Cart abandonment API called");
    
    const { session } = await authenticate.admin(request);
    console.log("✅ Session authenticated:", session.shop);

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();
    console.log("📦 Request body:", body);

    const { customerId, cartData, discountPercentage = 10 } = body;

    if (!cartData) {
      return json({ 
        error: "Missing required field: cartData" 
      }, { status: 400 });
    }

    // Check if cart abandonment recovery is enabled in widget settings
    const widgetSettings = await prisma.widgetSettings.findUnique({
      where: { shopDomain: session.shop }
    });

    // If cart abandonment is not enabled, return error
    if (!widgetSettings?.cartAbandonmentEnabled) {
      console.log("🚫 Cart abandonment recovery is disabled for shop:", session.shop);
      return json({ 
        error: "Cart abandonment recovery is not enabled",
        message: "Please enable cart abandonment recovery in your widget settings to use this feature."
      }, { status: 403 });
    }

    console.log("✅ Cart abandonment recovery is enabled for shop:", session.shop);

    // Use discount percentage from widget settings if available, otherwise use request body or default
    const configuredDiscountPercentage = widgetSettings.cartAbandonmentDiscount || discountPercentage;

    // Check rate limiting - only 1 discount per session/customer per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rateLimitWhere = {
      shopDomain: session.shop,
      createdAt: {
        gte: oneHourAgo
      }
    };

    // Use customerId if available, otherwise use sessionId
    if (customerId) {
      rateLimitWhere.customerId = customerId;
    } else {
      rateLimitWhere.sessionId = session.id;
    }

    const recentDiscount = await prisma.cartAbandonmentLog.findFirst({
      where: rateLimitWhere
    });

    if (recentDiscount) {
      console.log("⏰ Rate limit hit for", customerId ? `customer: ${customerId}` : `session: ${session.id}`);
      return json({ 
        error: "A discount was already created within the last hour",
        rateLimited: true 
      }, { status: 429 });
    }

    // Try multiple possible endpoints for the external API
    // Based on logs, the external API is using /api/shopify/abandoned-cart-discount
    const possibleEndpoints = [
      '/api/shopify/abandoned-cart-discount',
      '/api/abandoned-cart-discount',
      '/abandoned-cart-discount', 
      '/shopify/abandoned-cart-discount'
    ];

    let externalResponse = null;
    let successfulEndpoint = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        const response = await fetch(`https://cartrecover-bot.onrender.com${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            session_id: session.id,
            shop_domain: session.shop,
            customer_id: customerId,
            cart_data: cartData,
            discount_percentage: configuredDiscountPercentage
          })
        });

        console.log(`📡 Response status for ${endpoint}:`, response.status);

        if (response.ok) {
          externalResponse = await response.json();
          successfulEndpoint = endpoint;
          console.log(`✅ Success with endpoint: ${endpoint}`, externalResponse);
          break;
        } else if (response.status !== 404) {
          // If it's not a 404, log the error but continue trying other endpoints
          const errorText = await response.text();
          console.log(`❌ Error ${response.status} for ${endpoint}:`, errorText);
        }
      } catch (error) {
        console.log(`🚨 Network error for ${endpoint}:`, error.message);
        // Continue to next endpoint
      }
    }

    if (!externalResponse) {
      console.log("❌ All endpoints failed");
      
      // Log the failure
      await prisma.cartAbandonmentLog.create({
        data: {
          sessionId: session.id,
          customerId: customerId || null,
          shopDomain: session.shop,
          discountCode: null,
          discountPercentage: configuredDiscountPercentage,
          success: false,
          errorMessage: "External API not accessible - all endpoints returned 404 or failed"
        }
      });

      return json({ 
        error: "External cart recovery service is not accessible. Please check if the service is running.",
        details: "Tried multiple endpoints but none were accessible",
        endpoints_tried: possibleEndpoints
      }, { status: 503 });
    }

    // Log successful discount creation
    await prisma.cartAbandonmentLog.create({
      data: {
        sessionId: session.id,
        customerId: customerId || null,
        shopDomain: session.shop,
        discountCode: externalResponse.discount_code || null,
        discountPercentage: configuredDiscountPercentage,
        success: true,
        errorMessage: null
      }
    });

    console.log("✅ Cart abandonment discount created successfully");
    
    return json({
      success: true,
      discount_code: externalResponse.discount_code,
      message: externalResponse.message || "Discount created successfully",
      endpoint_used: successfulEndpoint
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error("🚨 Cart abandonment API error:", error);
    
    return json({ 
      error: "Internal server error",
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
};

export const loader = async () => {
  return json({ 
    message: "Cart abandonment discount API - POST requests only" 
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

// Handle preflight OPTIONS requests
export const options = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};
