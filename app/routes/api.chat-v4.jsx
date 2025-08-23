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

// Handle POST requests - detailed debugging of request
export async function action({ request }) {
  try {
    console.log("🔎 Chat-v4 Request debugging");
    console.log("🔎 Chat-v4 Request method:", request.method);
    console.log("🔎 Chat-v4 Request URL:", request.url);
    console.log("🔎 Chat-v4 Content-Type:", request.headers.get("content-type"));
    console.log("🔎 Chat-v4 Content-Length:", request.headers.get("content-length"));
    console.log("🔎 Chat-v4 User-Agent:", request.headers.get("user-agent"));
    
    // Try different methods to read the body
    console.log("🔎 Chat-v4 Trying request.text()...");
    const bodyText = await request.text();
    console.log("🔎 Chat-v4 Body text:", bodyText);
    console.log("🔎 Chat-v4 Body text length:", bodyText?.length || 0);
    
    if (!bodyText || bodyText.trim() === "") {
      return json({
        success: false,
        error: "Empty request body received",
        debug: {
          method: request.method,
          url: request.url,
          contentType: request.headers.get("content-type"),
          contentLength: request.headers.get("content-length"),
          userAgent: request.headers.get("user-agent")
        },
        timestamp: new Date().toISOString()
      }, {
        status: 400,
        headers: corsHeaders
      });
    }
    
    let payload;
    try {
      payload = JSON.parse(bodyText);
      console.log("🔎 Chat-v4 Parsed payload:", payload);
    } catch (parseError) {
      console.error("❌ Chat-v4 JSON parse error:", parseError);
      return json({
        success: false,
        error: "Invalid JSON",
        receivedBody: bodyText,
        parseError: parseError.message,
        timestamp: new Date().toISOString()
      }, {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Forward to external API
    console.log("🔎 Chat-v4 Forwarding to external API...");
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
