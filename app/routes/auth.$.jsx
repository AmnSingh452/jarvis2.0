import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  console.log("🔍 AUTH CATCH-ALL ROUTE HIT:");
  console.log("📍 Full URL:", request.url);
  console.log("📍 Pathname:", url.pathname);
  console.log("📍 Params:", params);
  console.log("📍 Search params:", url.searchParams.toString());
  console.log("📍 User Agent:", request.headers.get('user-agent'));
  console.log("📍 Referer:", request.headers.get('referer'));
  
  // If this is a callback attempt, let's see what we got
  if (url.pathname.includes('callback')) {
    console.log("🚨 CALLBACK ATTEMPT DETECTED but not hitting auth.callback.jsx");
    console.log("🚨 This suggests the callback URL might be different than expected");
    console.log("🚨 Expected: /auth/callback");
    console.log("🚨 Actual:", url.pathname);
  }

  try {
    console.log("🔐 Attempting authentication in catch-all route...");
    const { session, admin } = await authenticate.admin(request);
    
    if (session) {
      console.log("✅ Authentication successful in catch-all!");
      console.log("📊 Session details:", {
        shop: session.shop,
        scope: session.scope,
        hasToken: !!session.accessToken,
        isOnline: session.isOnline,
        userId: session.userId
      });
      console.log("🚀 Redirecting to main app...");
    } else {
      console.log("⚠️ No session found in catch-all route");
    }
  } catch (error) {
    console.log("❌ Auth catch-all authentication error:", error.message);
    console.log("📋 Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
  }

  return null;
};
