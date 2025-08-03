import { json } from "@remix-run/node";

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

// Handle POST requests for session
export async function action({ request }) {
  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    console.log("🔐 Session API request received");

    // Forward to external API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/session", {
      method: "POST",
      headers: {
        "Content-Type": contentType || "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: body
    });

    const responseData = await response.text();
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json"
      }
    });

  } catch (error) {
    console.error("❌ Session API proxy error:", error);
    
    return json({
      success: false,
      error: "Session service unavailable",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle GET requests
export async function loader({ request }) {
  return json({
    success: true,
    message: "Session API endpoint is active",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
