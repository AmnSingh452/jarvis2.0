import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * API endpoint to manually ensure shop data is in the Shop table
 * This fixes the issue where external APIs can't find shop access tokens
 */

export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session || !session.shop || !session.accessToken) {
      return json({ 
        success: false, 
        error: "No valid session found" 
      }, { status: 401 });
    }

    // Ensure shop data exists in Shop table
    const shopRecord = await db.shop.upsert({
      where: { shopDomain: session.shop },
      update: {
        accessToken: session.accessToken,
        isActive: true,
        uninstalledAt: null,
        tokenVersion: { increment: 1 }
      },
      create: {
        shopDomain: session.shop,
        accessToken: session.accessToken,
        installedAt: new Date(),
        isActive: true,
        tokenVersion: 1
      }
    });

    console.log(`✅ Shop data ensured for: ${session.shop}`);

    return json({
      success: true,
      message: "Shop data added to database",
      shop: session.shop,
      hasAccessToken: !!shopRecord.accessToken,
      tokenPreview: shopRecord.accessToken ? shopRecord.accessToken.substring(0, 15) + "..." : null
    });

  } catch (error) {
    console.error("❌ Failed to ensure shop data:", error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ 
    message: "Use POST to ensure shop data exists in database" 
  });
}
