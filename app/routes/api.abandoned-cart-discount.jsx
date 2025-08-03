import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Generate random discount code
function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, shop_domain, discount_percentage = 10 } = body;

    // Try to get shop domain from multiple sources
    let shopDomain = shop_domain;
    
    if (!shopDomain) {
      // Try to extract from session
      shopDomain = session?.shop;
    }
    
    if (!shopDomain) {
      // Try to extract from request headers (Shopify-Shop-Domain)
      shopDomain = request.headers.get('Shopify-Shop-Domain');
    }
    
    if (!shopDomain) {
      // Fallback to default shop (for development/testing)
      shopDomain = 'aman-chatbot-test.myshopify.com';
      console.log(`⚠️ Using fallback shop domain: ${shopDomain}`);
    }

    console.log(`🛍️ Processing abandoned cart discount for shop: ${shopDomain}`);

    if (!session_id) {
      return json({ error: "session_id is required" }, { status: 400 });
    }

    // Get shop access token from session
    const shopifyAdmin = session.admin;
    const discountCode = generateRandomCode();
    const now = new Date().toISOString();

    try {
      // Create price rule first
      const priceRuleResponse = await shopifyAdmin.graphql(`
        mutation PriceRuleCreate($priceRule: PriceRuleInput!) {
          priceRuleCreate(priceRule: $priceRule) {
            priceRule {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          priceRule: {
            title: `AbandonedCart-${discountCode}`,
            targetType: "LINE_ITEM",
            targetSelection: "ALL",
            allocationMethod: "ACROSS",
            valueType: "PERCENTAGE",
            value: `-${discount_percentage}`,
            customerSelection: "ALL",
            startsAt: now,
            usageLimit: 1,
            oncePerCustomer: true
          }
        }
      });

      const priceRule = priceRuleResponse.data?.priceRuleCreate?.priceRule;
      const errors = priceRuleResponse.data?.priceRuleCreate?.userErrors;

      if (errors && errors.length > 0) {
        console.error("Price rule creation errors:", errors);
        return json({ 
          error: "Failed to create price rule",
          details: errors 
        }, { status: 500 });
      }

      if (!priceRule) {
        return json({ error: "Failed to create price rule" }, { status: 500 });
      }

      // Create discount code
      const discountCodeResponse = await shopifyAdmin.graphql(`
        mutation DiscountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  title
                  codes(first: 1) {
                    nodes {
                      code
                    }
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          basicCodeDiscount: {
            title: `AbandonedCart-${discountCode}`,
            code: discountCode,
            startsAt: now,
            customerSelection: {
              all: true
            },
            customerGets: {
              value: {
                percentage: discount_percentage / 100
              },
              items: {
                all: true
              }
            },
            usageLimit: 1
          }
        }
      });

      const discountNode = discountCodeResponse.data?.discountCodeBasicCreate?.codeDiscountNode;
      const discountErrors = discountCodeResponse.data?.discountCodeBasicCreate?.userErrors;

      if (discountErrors && discountErrors.length > 0) {
        console.error("Discount code creation errors:", discountErrors);
        return json({ 
          error: "Failed to create discount code",
          details: discountErrors 
        }, { status: 500 });
      }

      if (!discountNode) {
        return json({ error: "Failed to create discount code" }, { status: 500 });
      }

      console.log(`✅ Discount code created: ${discountCode} (${discount_percentage}% off)`);

      return json({
        discount_code: discountCode,
        discount_percentage,
        message: `${discount_percentage}% discount code created successfully`,
        session_id,
        expires_in: "24 hours"
      });

    } catch (shopifyError) {
      console.error("Shopify discount creation error:", shopifyError);
      return json({ 
        error: "Failed to create discount with Shopify API",
        details: shopifyError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Abandoned cart discount API error:", error);
    return json({ 
      error: "Invalid or missing JSON body"
    }, { status: 400 });
  }
};

// Handle GET requests for testing
export const loader = async () => {
  return json({
    message: "Abandoned Cart Discount API - Use POST with session_id, shop_domain, and discount_percentage",
    example: {
      session_id: "session_123",
      shop_domain: "your-shop.myshopify.com",
      discount_percentage: 10
    }
  });
};
