import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  console.log("🏠 App index route accessed");
  console.log("📍 Request URL:", request.url);
  console.log("📍 Request headers:", {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    host: request.headers.get('host'),
    authorization: request.headers.get('authorization') ? 'Present' : 'Missing'
  });
  
  try {
    console.log("🔐 Starting authentication...");
    const { session } = await authenticate.admin(request);
    console.log(`📍 App index session:`, {
      shop: session?.shop,
      hasToken: !!session?.accessToken,
      scopes: session?.scope,
      isOnline: session?.isOnline,
      userId: session?.userId
    });
  
    // Check if this is a fresh installation
    try {
      const { verifyFreshInstallation } = await import("../../cleanup-db.js");
      const verification = await verifyFreshInstallation(session.shop);
      
      console.log(`🔍 Fresh installation check:`, {
        shop: session.shop,
        isFreshInstall: verification.isFresh,
        oldSessions: verification.oldSessions,
        oldShops: verification.oldShops
      });

      // PRODUCTION-READY: Use session data to maintain shop records
      // This handles multiple clients and reinstallation scenarios
      if (session && session.accessToken) {
        try {
          const db = await import("../db.server");
          
          // Check if shop exists and its status
          const existingShop = await db.default.shop.findUnique({
            where: { shopDomain: session.shop }
          });
          
          let isNewInstallation = false;
          let isReinstallation = false;
          
          if (!existingShop) {
            // Completely new shop
            isNewInstallation = true;
          } else if (!existingShop.isActive || existingShop.uninstalledAt) {
            // Shop exists but was uninstalled - this is a reinstallation
            isReinstallation = true;
        }
        
        // Always ensure shop data is current with latest session info
        const shopData = await db.default.shop.upsert({
          where: { shopDomain: session.shop },
          update: {
            accessToken: session.accessToken,
            isActive: true,
            uninstalledAt: null, // Clear uninstall timestamp
            tokenVersion: isReinstallation ? { increment: 1 } : undefined
          },
          create: {
            shopDomain: session.shop,
            accessToken: session.accessToken,
            installedAt: new Date(),
            isActive: true,
            tokenVersion: 1
          }
        });
        
        // Log based on scenario
        if (isNewInstallation) {
          console.log(`💾 NEW INSTALLATION: ${session.shop} (ID: ${shopData.id})`);
          
          await db.default.installationLog.create({
            data: {
              shopDomain: session.shop,
              action: "SHOP_INSTALLED",
              metadata: {
                shopId: shopData.id,
                tokenVersion: shopData.tokenVersion,
                scopes: session.scope,
                sessionId: session.id,
                timestamp: new Date().toISOString(),
                clientType: "new"
              }
            }
          });
          
        } else if (isReinstallation) {
          console.log(`🔄 REINSTALLATION: ${session.shop} (ID: ${shopData.id}, Version: ${shopData.tokenVersion})`);
          
          await db.default.installationLog.create({
            data: {
              shopDomain: session.shop,
              action: "SHOP_REINSTALLED",
              metadata: {
                shopId: shopData.id,
                tokenVersion: shopData.tokenVersion,
                scopes: session.scope,
                sessionId: session.id,
                timestamp: new Date().toISOString(),
                previouslyUninstalledAt: existingShop?.uninstalledAt?.toISOString(),
                clientType: "returning"
              }
            }
          });
          
        } else {
          // Existing active shop - just ensure token is fresh
          console.log(`✅ ACTIVE CLIENT: ${session.shop} - token refreshed`);
        }
        
      } catch (dbError) {
        console.error("❌ Database error during shop data sync:", dbError);
        console.error("   Shop:", session.shop);
        console.error("   Session ID:", session.id);
        // Log but don't fail the app
      }
    }
    
    // If it's a fresh install and user hasn't seen welcome page, redirect
    const url = new URL(request.url);
    const hasSeenWelcome = url.searchParams.get("welcomed") === "true";
    
    if (verification.isFresh && !hasSeenWelcome) {
      return redirect("/app/welcome");
    }
  } catch (error) {
    console.log("Fresh installation check failed:", error);
  }
  } catch (authError) {
    console.error("❌ Authentication failed in app index:", authError);
    console.error("📋 Auth error details:", {
      name: authError.name,
      message: authError.message,
      stack: authError.stack?.substring(0, 500)
    });
    throw authError;
  }

  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <Page>
      <TitleBar title="Jarvis AI Assistant Dashboard">
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </TitleBar>
      <BlockStack gap="500">
        {/* Quick Actions Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  Quick Actions
                </Text>
                <Layout>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          🎨 Widget Settings
                        </Text>
                        <Text variant="bodyMd" as="p">
                          Customize your chatbot's appearance, colors, and behavior to match your store's branding.
                        </Text>
                        <InlineStack gap="200">
                          <Button 
                            url="/app/widget-settings" 
                            variant="primary"
                          >
                            Configure Widget
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          � Analytics Dashboard
                        </Text>
                        <Text variant="bodyMd" as="p">
                          Monitor chatbot performance, track conversions, and gain insights into customer interactions.
                        </Text>
                        <InlineStack gap="200">
                          <Button 
                            url="/app/analytics" 
                            variant="primary"
                          >
                            View Analytics
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          �💳 Billing & Plans
                        </Text>
                        <Text variant="bodyMd" as="p">
                          Manage your subscription, view usage analytics, and configure your plan settings.
                        </Text>
                        <InlineStack gap="200">
                          <Button 
                            url="/app/billing_v2" 
                            variant="primary"
                          >
                            Manage Billing
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          🚀 Welcome Guide
                        </Text>
                        <Text variant="bodyMd" as="p">
                          New to Jarvis? Learn how to set up and optimize your AI assistant for maximum performance.
                        </Text>
                        <InlineStack gap="200">
                          <Button 
                            url="/app/welcome" 
                            variant="primary"
                          >
                            Get Started
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          ⚡ Additional Features
                        </Text>
                        <Text variant="bodyMd" as="p">
                          Explore advanced features and integrations to enhance your customer experience.
                        </Text>
                        <InlineStack gap="200">
                          <Button 
                            url="/app/additional" 
                            variant="primary"
                          >
                            Explore Features
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Congrats on creating a new Shopify app 🎉
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This embedded app template uses{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/app-bridge"
                      target="_blank"
                      removeUnderline
                    >
                      App Bridge
                    </Link>{" "}
                    interface examples like an{" "}
                    <Link url="/app/additional" removeUnderline>
                      additional page in the app nav
                    </Link>
                    , as well as an{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      Admin GraphQL
                    </Link>{" "}
                    mutation demo, to provide a starting point for app
                    development.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Get started with products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Generate a product with GraphQL and get the JSON output for
                    that product. Learn more about the{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                      target="_blank"
                      removeUnderline
                    >
                      productCreate
                    </Link>{" "}
                    mutation in our API references.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button loading={isLoading} onClick={generateProduct}>
                    Generate a product
                  </Button>
                  {fetcher.data?.product && (
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View product
                    </Button>
                  )}
                </InlineStack>
                {fetcher.data?.product && (
                  <>
                    <Text as="h3" variant="headingMd">
                      {" "}
                      productCreate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>
                          {JSON.stringify(fetcher.data.product, null, 2)}
                        </code>
                      </pre>
                    </Box>
                    <Text as="h3" variant="headingMd">
                      {" "}
                      productVariantsBulkUpdate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>
                          {JSON.stringify(fetcher.data.variant, null, 2)}
                        </code>
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Jarvis AI Assistant
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Customize your AI-powered chatbot widget to match your store's branding and behavior.
                  </Text>
                  <List>
                    <List.Item>
                      <Link url="/app/widget-settings" removeUnderline>
                        Widget Settings
                      </Link>{" "}
                      - Customize appearance, colors, and behavior
                    </List.Item>
                    <List.Item>
                      <Link url="/app/analytics" removeUnderline>
                        Analytics Dashboard
                      </Link>{" "}
                      - Monitor performance and customer insights
                    </List.Item>
                    <List.Item>
                      <Link url="/app/welcome" removeUnderline>
                        Welcome Guide
                      </Link>{" "}
                      - Get started with Jarvis features
                    </List.Item>
                    <List.Item>
                      <Link url="/app/billing_v2" removeUnderline>
                        Billing & Plans
                      </Link>{" "}
                      - Manage subscription and usage
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List>
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                        removeUnderline
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                        removeUnderline
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
              
              {/* Debug Tools - Development Only */}
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    🔧 Debug Tools
                  </Text>
                  <List>
                    <List.Item>
                      <Link
                        url="/debug/uninstall-test?action=check-webhooks"
                        removeUnderline
                      >
                        Check Webhook Registration
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="/debug/uninstall-test?action=status&shop=aman-chatbot-test.myshopify.com"
                        removeUnderline
                      >
                        Check Shop Status
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="/debug/uninstall-test"
                        removeUnderline
                      >
                        Debug Dashboard
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
