import { login } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const ref = url.searchParams.get("ref");
  
  console.log("AUTH ROUTE: shop=" + shop + ", ref=" + ref);
  
  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }
  
  try {
    // Store referral code if provided
    if (ref) {
      console.log("Storing referral code for OAuth callback");
      await prisma.pendingReferral.upsert({
        where: { shopDomain: shop },
        create: {
          shopDomain: shop,
          referralCode: ref,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        update: {
          referralCode: ref,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      console.log("Referral code stored successfully");
    }
    
    // Initiate OAuth flow - this will redirect to Shopify
    console.log("Initiating OAuth flow for shop:", shop);
    return await login(request);
    
  } catch (error) {
    console.error("Auth error:", error);
    console.error("Error stack:", error.stack);
    return new Response("Authentication error: " + (error.message || "Unknown error"), { status: 500 });
  }
};
