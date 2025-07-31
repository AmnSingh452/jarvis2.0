import { json } from "@remix-run/node";
import { cleanupShopData, verifyFreshInstallation } from "../cleanup-db.js";

/**
 * API routes for managing shop installations
 * Useful for testing and debugging
 */

export async function loader({ request }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  switch (action) {
    case "verify":
      const verification = await verifyFreshInstallation(shop);
      return json(verification);
      
    case "info":
      const { getShopSessionInfo } = await import("../cleanup-db.js");
      const info = await getShopSessionInfo(shop);
      return json(info);
      
    default:
      return json({ 
        error: "Invalid action. Use: verify, info",
        usage: {
          verify: "/api/installation?action=verify&shop=example.myshopify.com",
          info: "/api/installation?action=info&shop=example.myshopify.com"
        }
      });
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const action = formData.get("action");
  const shop = formData.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  switch (action) {
    case "cleanup":
      // Manual cleanup (use with caution)
      const result = await cleanupShopData(shop);
      return json(result);
      
    default:
      return json({ error: "Invalid action. Use: cleanup" });
  }
}
