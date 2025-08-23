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

// Simple test endpoint to debug request body parsing
export async function action({ request }) {
  try {
    console.log("🧪 Test endpoint - Request method:", request.method);
    console.log("🧪 Test endpoint - Content-Type:", request.headers.get('content-type'));
    
    const requestBody = await request.text();
    console.log("🧪 Test endpoint - Raw body:", requestBody);
    console.log("🧪 Test endpoint - Body length:", requestBody?.length || 0);
    
    if (!requestBody || requestBody.trim() === "") {
      return json({
        success: false,
        error: "Empty request body",
        message: "No body received",
        timestamp: new Date().toISOString()
      }, {
        status: 400,
        headers: corsHeaders
      });
    }
    
    let payload;
    try {
      payload = JSON.parse(requestBody);
    } catch (parseError) {
      return json({
        success: false,
        error: "Invalid JSON",
        message: parseError.message,
        receivedBody: requestBody,
        timestamp: new Date().toISOString()
      }, {
        status: 400,
        headers: corsHeaders
      });
    }
    
    return json({
      success: true,
      message: "Test endpoint working!",
      receivedPayload: payload,
      timestamp: new Date().toISOString()
    }, {
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error("🧪 Test endpoint error:", error);
    return json({
      success: false,
      error: "Server error",
      message: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function loader() {
  return json({
    success: true,
    message: "Test endpoint is active",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
