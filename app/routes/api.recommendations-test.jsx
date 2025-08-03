import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const { product_ids = [], customer_id, shop_domain } = body;

    console.log("🔍 Recommendations request received:", {
      product_ids,
      customer_id,
      shop_domain,
      timestamp: new Date().toISOString()
    });

    // Try to get shop domain from multiple sources
    let shopDomain = shop_domain;
    
    if (!shopDomain) {
      // Try to extract from request headers
      shopDomain = request.headers.get('Shopify-Shop-Domain') || 
                   request.headers.get('x-shop-domain');
    }
    
    if (!shopDomain) {
      // Fallback to default shop (for development/testing)
      shopDomain = 'aman-chatbot-test.myshopify.com';
      console.log(`⚠️ Using fallback shop domain: ${shopDomain}`);
    }

    console.log(`🛍️ Processing recommendations for shop: ${shopDomain}`);

    // Return mock data for testing
    const mockRecommendations = [
      {
        id: "1",
        title: "Test Product 1",
        handle: "test-product-1",
        description: "A test product for recommendations",
        price: "29.99",
        available: true,
        image: "https://via.placeholder.com/200x200"
      },
      {
        id: "2",
        title: "Test Product 2", 
        handle: "test-product-2",
        description: "Another test product",
        price: "39.99",
        available: true,
        image: "https://via.placeholder.com/200x200"
      }
    ];

    console.log("✅ Returning mock recommendations");

    return json({ 
      recommendations: mockRecommendations,
      total: mockRecommendations.length,
      message: "Mock recommendations API working"
    });

  } catch (error) {
    console.error("❌ Recommendations API error:", error);
    return json({ 
      error: "Invalid or missing JSON body",
      recommendations: []
    }, { status: 400 });
  }
};

export const loader = async () => {
  return json({
    message: "Recommendations API - Use POST with product_ids, customer_id, and shop_domain",
    example: {
      product_ids: ["123456789", "987654321"],
      customer_id: "123456789", 
      shop_domain: "your-shop.myshopify.com"
    },
    status: "working"
  });
};
