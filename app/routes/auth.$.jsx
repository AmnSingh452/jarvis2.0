import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  console.log("🔍 AUTH CATCH-ALL ROUTE HIT:");
  console.log("📍 Full URL:", request.url);
  console.log("📍 Pathname:", url.pathname);
  console.log("📍 Params:", params);
  console.log("📍 Search params:", url.searchParams.toString());
  
  // If this is a callback attempt, let's see what we got
  if (url.pathname.includes('callback')) {
    console.log("🚨 CALLBACK ATTEMPT DETECTED but not hitting auth.callback.jsx");
    console.log("🚨 This suggests the callback URL might be different than expected");
    console.log("🚨 Expected: /auth/callback");
    console.log("🚨 Actual:", url.pathname);
  }

  try {
    await authenticate.admin(request);
  } catch (error) {
    console.log("❌ Auth catch-all authentication error:", error.message);
  }

  return null;
};
