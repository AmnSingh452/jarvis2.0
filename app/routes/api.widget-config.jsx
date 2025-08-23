import { json } from "@remix-run/node";

// API endpoint to provide configuration for the chatbot widget
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    // Get the app's base URL from the request
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const appBaseUrl = `${protocol}://${host}`;
    
    console.log(`🔧 Widget configuration requested for shop: ${shop}`);
    console.log(`🌐 App base URL: ${appBaseUrl}`);

    const config = {
      success: true,
      app_base_url: appBaseUrl,
      api_endpoints: {
        chat: `${appBaseUrl}/api/chat`,
        recommendations: `${appBaseUrl}/api/recommendations`,
        abandoned_cart_discount: `${appBaseUrl}/api/abandoned-cart-discount`,
        widget_settings: `${appBaseUrl}/api/widget-settings`,
        shop_verify: `${appBaseUrl}/api/shop-verify`,
        session: `${appBaseUrl}/api/session`,
        customer_update: `${appBaseUrl}/api/customer/update`
      },
      shop: shop,
      timestamp: new Date().toISOString()
    };

    return json(config, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=300" // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error("❌ Widget config error:", error);
    
    return json({
      success: false,
      error: "Failed to get widget configuration",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// Handle preflight requests
export async function options() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
