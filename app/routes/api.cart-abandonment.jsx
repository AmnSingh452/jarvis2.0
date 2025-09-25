import { json } from "@remix-run/node";

export async function action({ request }) {
  // Add CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();
    const {
      session_id,
      shop_domain,
      customer_id,
      cart_total
    } = body;

    console.log('🛒 Cart abandonment request:', { session_id, shop_domain, customer_id, cart_total });

    if (!session_id || !shop_domain) {
      return json({
        success: false,
        error: "Missing required fields: session_id and shop_domain"
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
        where: { shopDomain: shop_domain }
      });

      if (!settings || !settings.cartAbandonmentEnabled) {
        return json({
          success: false,
          error: "Cart abandonment recovery is not enabled for this shop"
        }, { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // Check if we've already sent a discount to this session recently
      const recentDiscount = await prisma.cartAbandonmentLog.findFirst({
        where: {
          sessionId: session_id,
          shopDomain: shop_domain,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Within last hour
          }
        }
      });

      if (recentDiscount) {
        return json({
          success: false,
          error: "Discount already sent to this session recently",
          discount_code: recentDiscount.discountCode
        }, { 
          status: 429,
          headers: corsHeaders 
        });
      }

      // Call your external API to create the discount
      const externalApiResponse = await fetch("https://cartrecover-bot.onrender.com/api/shopify/abandoned-cart-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id,
          shop_domain,
          customer_id,
          discount_percentage: settings.cartAbandonmentDiscount
        })
      });

      const externalResult = await externalApiResponse.json();

      if (!externalResult.discount_code) {
        return json({
          success: false,
          error: "Failed to create discount code",
          details: externalResult
        }, { 
          status: 500,
          headers: corsHeaders 
        });
      }

      // Log the discount creation
      await prisma.cartAbandonmentLog.create({
        data: {
          sessionId: session_id,
          shopDomain: shop_domain,
          customerId: customer_id,
          discountCode: externalResult.discount_code,
          discountPercentage: settings.cartAbandonmentDiscount,
          cartTotal: cart_total ? parseFloat(cart_total) : null
        }
      });

      // Format the message with actual values
      const message = settings.cartAbandonmentMessage
        .replace('{discount}', settings.cartAbandonmentDiscount.toString())
        .replace('{code}', externalResult.discount_code);

      return json({
        success: true,
        discount_code: externalResult.discount_code,
        discount_percentage: settings.cartAbandonmentDiscount,
        message: message,
        delay: settings.cartAbandonmentDelay
      }, { 
        headers: corsHeaders 
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error("Cart abandonment error:", error);
    return json({
      success: false,
      error: "Internal server error",
      details: error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}
