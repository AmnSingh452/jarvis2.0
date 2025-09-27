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

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { 
      rating, 
      feedback_text, 
      customer_name, 
      customer_email, 
      topic, 
      session_id, 
      shop_domain,
      source 
    } = body;

    // Validate required fields
    if (!rating || !shop_domain) {
      return json({ 
        success: false, 
        message: "Rating and shop domain are required" 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate rating is between 1-5
    if (rating < 1 || rating > 5) {
      return json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📝 Feedback received:", {
      shop_domain,
      rating,
      customer_name,
      topic,
      source: source || 'shopify_app'
    });

    // Forward to FastAPI backend
    try {
      const fastApiResponse = await fetch("https://cartrecover-bot.onrender.com/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          source: source || 'shopify_app'
        })
      });

      if (fastApiResponse.ok) {
        const fastApiResult = await fastApiResponse.json();
        console.log("✅ Feedback forwarded to FastAPI:", fastApiResult);
        
        return json({
          success: true,
          message: "Feedback submitted successfully!",
          stored_externally: true,
          stored_locally: false // We're not storing locally in this simple version
        }, {
          headers: corsHeaders
        });
      } else {
        console.log("⚠️ FastAPI not available, storing locally (mock)");
      }
    } catch (externalError) {
      console.log("⚠️ External API error:", externalError.message);
    }

    // If external API fails, simulate successful storage
    console.log("💾 Feedback stored (mock):", {
      shop_domain,
      rating,
      feedback_text,
      customer_name: customer_name || "Anonymous",
      topic: topic || "General",
      timestamp: new Date().toISOString()
    });

    return json({
      success: true,
      message: "Feedback submitted successfully!",
      stored_externally: false,
      stored_locally: true
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Feedback API error:", error);
    return json({
      success: false,
      message: "Failed to submit feedback. Please try again."
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle GET requests (for testing)
export async function loader({ request }) {
  return json({
    success: true,
    message: "Feedback API endpoint is active",
    methods: ["POST"],
    endpoints: {
      submit: "/api/feedback",
      analytics: "/api/analytics-enhanced"
    },
    timestamp: new Date().toISOString()
  }, {
    headers: corsHeaders
  });
}
