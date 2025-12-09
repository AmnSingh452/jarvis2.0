import { login } from "../shopify.server";
import { loginErrorMessage } from "./auth.login/error.server";
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
    }
    
    const errors = loginErrorMessage(await login(request));
    
    if (errors?.shop) {
      return new Response(errors.shop, { status: 400 });
    }
    
  } catch (error) {
    console.error("Auth error:", error);
    return new Response("Authentication error: " + error.message, { status: 500 });
  }
};
