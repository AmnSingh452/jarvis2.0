import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  // Get the shop domain and create store handle
  const shopDomain = session.shop;
  const storeHandle = shopDomain.replace('.myshopify.com', '');
  const appHandle = 'jarvis2-0';
  
  // Redirect directly to Shopify's managed pricing page
  const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
  
  return redirect(managedPricingUrl);
}
