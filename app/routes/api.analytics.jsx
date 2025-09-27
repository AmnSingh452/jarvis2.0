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

// Handle GET requests
export async function loader({ request }) {
  return json({
    success: true,
    message: "Analytics API endpoint is active",
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}

export async function action({ request }) {

  try {
    const body = await request.json();
    const { 
      shopDomain, 
      type,
      eventType = type, // Support both 'type' and 'eventType' for compatibility
      sessionId,
      customerName
    } = body;

    if (!shopDomain) {
      return json({ error: "Shop domain is required" }, { status: 400, headers: corsHeaders });
    }

    // Log the analytics event for now (we can enhance this later)
    console.log(`📊 Analytics Event: ${eventType}`, {
      shopDomain,
      sessionId,
      customerName,
      timestamp: new Date().toISOString()
    });

    // For now, just return success - the analytics will work when deployed
    // with proper database access
    return json({ 
      success: true, 
      message: "Analytics event logged",
      eventType,
      shopDomain 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Analytics API error:", error);
    return json({ error: "Failed to process analytics event" }, { status: 500, headers: corsHeaders });
  }
}
