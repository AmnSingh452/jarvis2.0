import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function action({ request }) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.json();
    
    const { 
      session_id, 
      shop_domain, 
      customer_id, 
      cart_total 
    } = formData;

    console.log("🛒 Cart abandonment request:", { 
      session_id, 
      shop_domain, 
      customer_id, 
      cart_total,
      sessionShop: session.shop 
    });

    if (!session_id || !shop_domain) {
      return json({
        success: false,
        error: "Missing required parameters: session_id and shop_domain are required"
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      // Get widget settings for this shop
      const settings = await prisma.widgetSettings.findUnique({
        where: { shopDomain: session.shop }
      });

      console.log("📤 Loading settings for", session.shop, ":", settings);

      if (!settings || !settings.cartAbandonmentEnabled) {
        return json({
          success: false,
          error: "Cart abandonment recovery is not enabled for this shop"
        }, { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // Check if we've already sent a discount to this session recently (1 hour limit)
      const recentDiscount = await prisma.cartAbandonmentLog.findFirst({
        where: {
          sessionId: session_id,
          shopDomain: session.shop,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Within last hour
          }
        }
      });

      if (recentDiscount) {
        return json({
          success: false,
          error: "You can only generate one discount code per hour. Please try again later.",
          discount_code: recentDiscount.discountCode,
          created_at: recentDiscount.createdAt
        }, { 
          status: 429,
          headers: corsHeaders 
        });
      }

      console.log("🔗 Calling external API with:", {
        session_id,
        shop_domain,
        discount_percentage: settings.cartAbandonmentDiscount
      });

      // Call your external API with the correct endpoint and format
      const externalApiResponse = await fetch("https://cartrecover-bot.onrender.com/api/abandoned-cart-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: session_id,
          shop_domain: shop_domain,
          discount_percentage: settings.cartAbandonmentDiscount
        })
      });

      console.log("📡 External API response status:", externalApiResponse.status);
      
      let externalResult;
      try {
        externalResult = await externalApiResponse.json();
        console.log("📥 External API response:", externalResult);
      } catch (parseError) {
        console.error("❌ Failed to parse external API response:", parseError);
        return json({
          success: false,
          error: "Invalid response from discount service",
          details: { status: externalApiResponse.status }
        }, { 
          status: 500,
          headers: corsHeaders 
        });
      }

      // Handle external API errors
      if (!externalApiResponse.ok || externalResult.error) {
        return json({
          success: false,
          error: externalResult.error || "Failed to create discount code",
          details: externalResult
        }, { 
          status: externalApiResponse.status || 500,
          headers: corsHeaders 
        });
      }

      // Verify we got a discount code
      if (!externalResult.discount_code) {
        return json({
          success: false,
          error: "No discount code returned from service",
          details: externalResult
        }, { 
          status: 500,
          headers: corsHeaders 
        });
      }

      // Log the discount creation in our database
      await prisma.cartAbandonmentLog.create({
        data: {
          sessionId: session_id,
          shopDomain: session.shop,
          customerId: customer_id || "anonymous",
          discountCode: externalResult.discount_code,
          discountPercentage: settings.cartAbandonmentDiscount,
          cartTotal: cart_total ? parseFloat(cart_total) : null
        }
      });

      // Format the message with actual values
      const message = settings.cartAbandonmentMessage
        .replace('{discount_code}', externalResult.discount_code)
        .replace('{discount_percentage}', settings.cartAbandonmentDiscount)
        .replace('{shop_name}', session.shop.replace('.myshopify.com', ''));

      console.log("✅ Cart abandonment success:", {
        discount_code: externalResult.discount_code,
        discount_percentage: settings.cartAbandonmentDiscount
      });

      return json({
        success: true,
        discount_code: externalResult.discount_code,
        discount_percentage: settings.cartAbandonmentDiscount,
        message: message,
        all_codes: externalResult.discount_codes || [externalResult.discount_code]
      }, {
        headers: corsHeaders
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error("💥 Cart abandonment error:", error);
    return json({
      success: false,
      error: "Internal server error",
      details: { message: error.message }
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}
