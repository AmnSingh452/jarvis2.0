import { json } from "@remix-run/node";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

// Handle OPTIONS preflight requests for dynamic session routes
export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

// Handle GET requests for session status
export async function loader({ params }) {
  const sessionId = params.sessionId;
  
  try {
    console.log(`🔐 Session status check for: ${sessionId}`);
    
    // Forward to external API
    const response = await fetch(`https://cartrecover-bot.onrender.com/api/session/${sessionId}`, {
      method: "GET",
      headers: {
        "User-Agent": "Shopify-Chatbot-Proxy/1.0"
      }
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
    console.error("❌ Session status error:", error);
    
    return json({
      success: false,
      error: "Session service unavailable",
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle POST/PUT requests for session updates
export async function action({ request, params }) {
  const sessionId = params.sessionId;
  
  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    
    console.log(`🔐 Session update for: ${sessionId}`);

    // Forward to external API
    const response = await fetch(`https://cartrecover-bot.onrender.com/api/session/${sessionId}`, {
      method: request.method,
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
    console.error("❌ Session update error:", error);
    
    return json({
      success: false,
      error: "Session service unavailable",
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}
