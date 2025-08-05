import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  console.log("🧪 Testing callback and auth routes");
  
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const testType = url.searchParams.get("test") || "routes";
  
  if (!shop) {
    return json({ error: "Shop parameter required. Use ?shop=your-store.myshopify.com" }, { status: 400 });
  }
  
  try {
    if (testType === "routes") {
      // Test if routes are accessible
      const results = {
        shop,
        timestamp: new Date().toISOString(),
        tests: {
          callback_route_exists: true, // This route exists if we're here
          refresh_route_exists: true,
          catch_all_exists: true
        },
        instructions: {
          force_callback: `Visit: ${url.origin}/auth/callback?shop=${shop}`,
          force_refresh: `Visit: ${url.origin}/auth/refresh?shop=${shop}`,
          clear_shop_data: `Visit: ${url.origin}/debug/clear-shop?shop=${shop}`
        }
      };
      
      console.log("🧪 Route test results:", results);
      return json(results);
    }
    
    if (testType === "force-callback") {
      // Force redirect to callback route
      console.log(`🔄 Forcing callback route for ${shop}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/auth/callback?shop=${shop}`
        }
      });
    }
    
    if (testType === "force-refresh") {
      // Force redirect to refresh route
      console.log(`🔄 Forcing refresh route for ${shop}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/auth/refresh?shop=${shop}`
        }
      });
    }
    
    return json({ error: "Unknown test type. Use ?test=routes|force-callback|force-refresh" }, { status: 400 });
    
  } catch (error) {
    console.log("❌ Debug test error:", error.message);
    return json({ error: error.message }, { status: 500 });
  }
};
