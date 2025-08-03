import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    // Import server modules inside the function to avoid client bundling issues
    const { authenticate } = await import("../shopify.server");
    const db = (await import("../db.server")).default;
    
    console.log("🔍 Shop verification request received");
    
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");
    
    if (!shopDomain) {
      return json({ error: "Missing shop parameter" }, { status: 400 });
    }
    
    // Check shop in database
    const shop = await db.shop.findUnique({
      where: { shopDomain: shopDomain },
      include: {
        subscription: true
      }
    });
    
    if (!shop) {
      return json({ 
        error: "Shop not found in database",
        shopDomain 
      }, { status: 404 });
    }
    
    // Check if shop is active
    if (!shop.isActive) {
      return json({ 
        error: "Shop is inactive (likely uninstalled)",
        shopDomain,
        uninstalledAt: shop.uninstalledAt
      }, { status: 401 });
    }
    
    // Test the token by making a simple API call
    try {
      const response = await fetch(`https://${shopDomain}/admin/api/2025-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': shop.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const shopData = await response.json();
        return json({
          success: true,
          shopDomain,
          tokenValid: true,
          shopInfo: {
            name: shopData.shop.name,
            domain: shopData.shop.domain,
            email: shopData.shop.email
          },
          dbInfo: {
            installedAt: shop.installedAt,
            tokenVersion: shop.tokenVersion,
            isActive: shop.isActive
          }
        });
      } else {
        return json({
          error: "Invalid token - API call failed",
          shopDomain,
          tokenValid: false,
          apiResponse: response.status,
          dbInfo: {
            installedAt: shop.installedAt,
            tokenVersion: shop.tokenVersion,
            isActive: shop.isActive
          }
        }, { status: 401 });
      }
    } catch (apiError) {
      return json({
        error: "Token validation failed",
        shopDomain,
        tokenValid: false,
        apiError: apiError.message
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("❌ Shop verification error:", error);
    return json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  return json({ error: "Method not allowed" }, { status: 405 });
};
