import { json } from "@remix-run/node";

// Simple in-memory cache to reduce API calls
const chatCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Handle POST requests for chat - REDIRECT TO WORKING CHAT-V2 ENDPOINT
export async function action({ request }) {
  console.log("🔄 Redirecting /api/chat request to /api/chat-v2 endpoint");
  
  // Read the request body
  const requestBody = await request.text();
  const contentType = request.headers.get("content-type");
  
  console.log("🔎 Redirect - Body length:", requestBody?.length || 0);
  
  // Forward the request to the working chat-v2 endpoint
  try {
    const response = await fetch("https://jarvis2-0-djg1.onrender.com/api/chat-v2", {
      method: "POST",
      headers: {
        "Content-Type": contentType || "application/json",
        "User-Agent": "Shopify-Chatbot-Proxy-Redirect/1.0"
      },
      body: requestBody
    });
    
    const responseData = await response.text();
    console.log("✅ Redirect successful, status:", response.status);
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Redirect": "chat-v2"
      }
    });
    
  } catch (error) {
    console.error("❌ Chat redirect error:", error);
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
