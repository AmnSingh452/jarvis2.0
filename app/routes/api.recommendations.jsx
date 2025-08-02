import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { product_ids = [], customer_id, shop_domain } = body;

    if (!shop_domain) {
      return json({ error: "Missing shop_domain" }, { status: 400 });
    }

    // Get shop access token from session
    const shopifyAdmin = session.admin;
    const recommendations = [];

    try {
      // 1. Cart-based recommendations - get products from product_ids
      if (product_ids && product_ids.length > 0) {
        for (const productId of product_ids.slice(0, 4)) { // Limit to 4 products
          try {
            const productResponse = await shopifyAdmin.graphql(`
              query GetProduct($id: ID!) {
                product(id: $id) {
                  id
                  title
                  handle
                  description
                  vendor
                  tags
                  images(first: 1) {
                    nodes {
                      url
                      altText
                    }
                  }
                  variants(first: 1) {
                    nodes {
                      id
                      price
                      compareAtPrice
                      availableForSale
                    }
                  }
                  collections(first: 5) {
                    nodes {
                      id
                      title
                    }
                  }
                }
              }
            `, {
              variables: { id: `gid://shopify/Product/${productId}` }
            });

            const product = productResponse.data?.product;
            if (product) {
              recommendations.push({
                id: product.id.split('/').pop(),
                title: product.title,
                handle: product.handle,
                description: product.description,
                vendor: product.vendor,
                tags: product.tags,
                image: product.images.nodes[0]?.url || null,
                price: product.variants.nodes[0]?.price || "0.00",
                compare_at_price: product.variants.nodes[0]?.compareAtPrice || null,
                available: product.variants.nodes[0]?.availableForSale || false
              });
            }
          } catch (productError) {
            console.error(`Error fetching product ${productId}:`, productError);
          }
        }
      }

      // 2. Customer history-based recommendations (if customer_id provided)
      if (customer_id && recommendations.length < 4) {
        try {
          const ordersResponse = await shopifyAdmin.graphql(`
            query GetCustomerOrders($customerId: ID!) {
              customer(id: $customerId) {
                orders(first: 10) {
                  nodes {
                    lineItems(first: 20) {
                      nodes {
                        product {
                          id
                          title
                          handle
                          images(first: 1) {
                            nodes {
                              url
                            }
                          }
                          variants(first: 1) {
                            nodes {
                              price
                              availableForSale
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `, {
            variables: { customerId: `gid://shopify/Customer/${customer_id}` }
          });

          const orders = ordersResponse.data?.customer?.orders?.nodes || [];
          const purchasedProducts = new Set();
          
          orders.forEach(order => {
            order.lineItems.nodes.forEach(lineItem => {
              const product = lineItem.product;
              if (product && !purchasedProducts.has(product.id)) {
                purchasedProducts.add(product.id);
                
                if (recommendations.length < 4) {
                  recommendations.push({
                    id: product.id.split('/').pop(),
                    title: product.title,
                    handle: product.handle,
                    image: product.images.nodes[0]?.url || null,
                    price: product.variants.nodes[0]?.price || "0.00",
                    available: product.variants.nodes[0]?.availableForSale || false
                  });
                }
              }
            });
          });
        } catch (customerError) {
          console.error("Error fetching customer orders:", customerError);
        }
      }

      // 3. Fallback: Popular/Featured products
      if (recommendations.length < 4) {
        try {
          const productsResponse = await shopifyAdmin.graphql(`
            query GetPopularProducts {
              products(first: 4, sortKey: BEST_SELLING) {
                nodes {
                  id
                  title
                  handle
                  description
                  vendor
                  images(first: 1) {
                    nodes {
                      url
                      altText
                    }
                  }
                  variants(first: 1) {
                    nodes {
                      id
                      price
                      compareAtPrice
                      availableForSale
                    }
                  }
                }
              }
            }
          `);

          const products = productsResponse.data?.products?.nodes || [];
          const existingIds = new Set(recommendations.map(r => r.id));
          
          products.forEach(product => {
            const productId = product.id.split('/').pop();
            if (!existingIds.has(productId) && recommendations.length < 4) {
              recommendations.push({
                id: productId,
                title: product.title,
                handle: product.handle,
                description: product.description,
                vendor: product.vendor,
                image: product.images.nodes[0]?.url || null,
                price: product.variants.nodes[0]?.price || "0.00",
                compare_at_price: product.variants.nodes[0]?.compareAtPrice || null,
                available: product.variants.nodes[0]?.availableForSale || false
              });
            }
          });
        } catch (popularError) {
          console.error("Error fetching popular products:", popularError);
        }
      }

      // Remove duplicates and limit to 4
      const uniqueRecommendations = recommendations
        .filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        )
        .slice(0, 4);

      return json({ 
        recommendations: uniqueRecommendations,
        total: uniqueRecommendations.length 
      });

    } catch (shopifyError) {
      console.error("Shopify API error:", shopifyError);
      return json({ 
        error: "Failed to fetch recommendations from Shopify",
        recommendations: []
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Recommendations API error:", error);
    return json({ 
      error: "Invalid or missing JSON body",
      recommendations: []
    }, { status: 400 });
  }
};

// Handle GET requests as well for testing
export const loader = async () => {
  return json({
    message: "Recommendations API - Use POST with product_ids, customer_id, and shop_domain",
    example: {
      product_ids: ["123456789", "987654321"],
      customer_id: "123456789",
      shop_domain: "your-shop.myshopify.com"
    }
  });
};
