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

// Handle POST requests - using Remix's request.json() method
export async function action({ request }) {
  try {
    console.log("🔎 Chat-v4 Using Remix request.json() method");
    
    // Use Remix's built-in JSON parsing
    const payload = await request.json();
    console.log("🔎 Chat-v4 Payload received:", payload);
    console.log("🔎 Chat-v4 Payload type:", typeof payload);
    
    // Forward to external API
    const response = await fetch("https://cartrecover-bot.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shopify-Chatbot-Remix-Proxy/1.0"
      },
      body: JSON.stringify(payload)
    });
    
    console.log("🔎 Chat-v4 External API response status:", response.status);
    const responseData = await response.text();
    console.log("🔎 Chat-v4 External API response:", responseData);
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("❌ Chat-v4 error:", error);
    return json({
      success: false,
      error: "Chat service unavailable",
      message: "Error: " + error.message,
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
    message: "Chat API v4 using Remix request.json()",
    method: "POST",
    endpoint: "/api/chat-v4",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
