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

// Handle POST requests - SIMPLE PASS-THROUGH PROXY
export async function action({ request }) {
  try {
    console.log("🔎 Chat-v3 Simple pass-through proxy");
    
    // Get the raw request body exactly as received
    const body = await request.text();
    console.log("🔎 Chat-v3 Raw body received:", body);
    console.log("🔎 Chat-v3 Body length:", body?.length || 0);
    
    // Get original headers
    const contentType = request.headers.get("content-type") || "application/json";
    console.log("🔎 Chat-v3 Content-Type:", contentType);
    
    // Simple fetch with minimal processing
    console.log("🔎 Chat-v3 Making request to external API...");
    const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "User-Agent": "Shopify-Chatbot-Simple-Proxy/1.0"
      },
      body: body // Pass through exactly as received
    });
    
    console.log("🔎 Chat-v3 External API response status:", response.status);
    const responseText = await response.text();
    console.log("🔎 Chat-v3 External API response:", responseText);
    
    // Return the response exactly as received
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("❌ Chat-v3 proxy error:", error);
    return json({
      success: false,
      error: "Chat service unavailable",
      message: "Proxy error: " + error.message,
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
    message: "Chat API v3 simple pass-through proxy",
    method: "POST",
    endpoint: "/api/chat-v3",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
