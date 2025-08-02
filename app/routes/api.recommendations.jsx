import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    // Log all incoming requests for debugging
    const body = await request.json();
    const { product_ids = [], customer_id, shop_domain } = body;
    
    console.log('🔍 Recommendations request received:', {
      product_ids: product_ids,
      customer_id: customer_id,
      shop_domain: shop_domain || 'NOT PROVIDED',
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries())
    });

    // Try to authenticate but don't fail if it doesn't work
    let session = null;
    try {
      const auth = await authenticate.public.appProxy(request);
      session = auth.session;
    } catch (authError) {
      console.log('⚠️ Authentication failed, continuing with fallback:', authError.message);
    }

    // Extract shop domain from multiple possible sources
    let shopDomain = shop_domain;
    if (!shopDomain && session?.shop) {
      shopDomain = session.shop;
    }
    if (!shopDomain) {
      // Check if shop domain is in the URL or headers
      const url = new URL(request.url);
      shopDomain = url.searchParams.get('shop') || 
                   request.headers.get('x-shop-domain') ||
                   'aman-chatbot-test.myshopify.com'; // Default fallback
    }

    console.log('🏪 Using shop domain:', shopDomain);

    const recommendations = [];

    // Try to use Shopify API if we have a valid session, otherwise use mock data
    if (session?.admin) {
      console.log('✅ Using Shopify API with authenticated session');
      const shopifyAdmin = session.admin;
      
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
      // Fall back to mock data if Shopify API fails
      console.log('🔄 Falling back to mock data due to Shopify API error');
      return json({ 
        recommendations: getMockRecommendations(),
        total: 4,
        note: "Mock data due to API error"
      });
    }
    
  } else {
    // No session available, return mock data
    console.log('⚠️ No authenticated session available, returning mock data');
    console.log('✅ Returning mock recommendations');
    
    return json({ 
      recommendations: getMockRecommendations(),
      total: 4,
      note: "Mock data - no authentication"
    });
  }

  } catch (error) {
    console.error("Recommendations API error:", error);
    console.log('🔄 Falling back to mock data due to request error');
    
    return json({ 
      recommendations: getMockRecommendations(),
      total: 4,
      note: "Mock data due to request error"
    }, { status: 200 }); // Return 200 instead of 400 to avoid errors in the chatbot
  }
};

// Mock data function
function getMockRecommendations() {
  return [
    {
      id: "8001",
      title: "Classic Cotton T-Shirt",
      handle: "classic-cotton-t-shirt",
      description: "Comfortable cotton t-shirt perfect for everyday wear.",
      vendor: "Fashion Co",
      image: "https://cdn.shopify.com/s/files/1/0001/0001/products/tshirt.jpg",
      price: "24.99",
      compare_at_price: "29.99",
      available: true
    },
    {
      id: "8002", 
      title: "Denim Jeans",
      handle: "denim-jeans",
      description: "Premium denim jeans with perfect fit.",
      vendor: "Denim Works",
      image: "https://cdn.shopify.com/s/files/1/0001/0001/products/jeans.jpg", 
      price: "79.99",
      compare_at_price: "99.99",
      available: true
    },
    {
      id: "8003",
      title: "Leather Sneakers", 
      handle: "leather-sneakers",
      description: "Stylish leather sneakers for casual outings.",
      vendor: "Shoe Store",
      image: "https://cdn.shopify.com/s/files/1/0001/0001/products/sneakers.jpg",
      price: "120.00",
      compare_at_price: null,
      available: true
    },
    {
      id: "8004",
      title: "Wool Sweater",
      handle: "wool-sweater", 
      description: "Warm and cozy wool sweater for cold days.",
      vendor: "Knit Co",
      image: "https://cdn.shopify.com/s/files/1/0001/0001/products/sweater.jpg",
      price: "89.99", 
      compare_at_price: "119.99",
      available: true
    }
  ];
}

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
