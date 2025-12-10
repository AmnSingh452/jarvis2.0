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
  
  // Store referral code if provided
  if (ref) {
    try {
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
    } catch (dbError) {
      console.error("Error storing referral code:", dbError);
      // Continue with OAuth even if referral storage fails
    }
  }
  
  // Initiate OAuth flow - login() will throw a redirect response
  console.log("Initiating OAuth flow for shop:", shop);
  await login(request);
  
  // If we reach here, login returned without redirecting (error case)
  return new Response("Failed to initiate OAuth", { status: 500 });
};
