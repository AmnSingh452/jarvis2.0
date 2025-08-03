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

// Handle POST requests for chat
export async function action({ request }) {
  try {
    // Parse the incoming request
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    console.log("🤖 Chat API request received:", {
      method: request.method,
      contentType,
      bodyLength: body.length
    });

    // Forward the request to the external CartRecover_Bot API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": contentType || "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      },
      body: body
    });

    const responseData = await response.text();
    
    console.log("🔄 External API response:", {
      status: response.status,
      ok: response.ok,
      responseLength: responseData.length
    });

    // Return the response with CORS headers
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json"
      }
    });

  } catch (error) {
    console.error("❌ Chat API proxy error:", error);
    
    return json({
      success: false,
      error: "Chat service unavailable",
      message: "Unable to connect to chat service. Please try again later.",
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle GET requests (if needed)
export async function loader({ request }) {
  return json({
    success: true,
    message: "Chat API endpoint is active",
    method: "POST",
    endpoint: "/api/chat",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
