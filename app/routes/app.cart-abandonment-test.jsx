import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  FormLayout,
  TextField,
  Banner,
  BlockStack,
  InlineStack,
  Badge,
  Spinner,
  List
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    console.log("🔍 Loading cart abandonment test data for shop:", session.shop);
    
    // Test database connection first
    await prisma.$connect();
    console.log("✅ Database connection successful");
    
    // Get widget settings - create if they don't exist
    let settings = await prisma.widgetSettings.findUnique({
      where: { shopDomain: session.shop }
    });

    if (!settings) {
      console.log("📝 Creating default widget settings for shop:", session.shop);
      try {
        settings = await prisma.widgetSettings.create({
          data: { 
            shopDomain: session.shop,
            isEnabled: true,
            primaryColor: "#007bff",
            secondaryColor: "#0056b3",
            buttonSize: "60px",
            position: "bottom-right",
            buttonIcon: "💬",
            windowWidth: "320px",
            windowHeight: "420px",
            headerText: "Jarvis AI Chatbot",
            placeholderText: "Type your message...",
            welcomeMessage: "Hello! How can I assist you today?",
            showTypingIndicator: true,
            enableSounds: false,
            autoOpen: false,
            cartAbandonmentEnabled: false,
            cartAbandonmentDiscount: 10,
            cartAbandonmentDelay: 300,
            cartAbandonmentMessage: "Don't miss out! Complete your purchase and get {discount}% off!"
          }
        });
        console.log("✅ Default settings created successfully");
      } catch (createError) {
        console.error("❌ Failed to create default settings:", createError);
        // If we can't create, return default values in memory
        settings = {
          shopDomain: session.shop,
          isEnabled: true,
          cartAbandonmentEnabled: false,
          cartAbandonmentDiscount: 10,
          cartAbandonmentDelay: 300,
          cartAbandonmentMessage: "Don't miss out! Complete your purchase and get {discount}% off!",
          primaryColor: "#007bff",
          secondaryColor: "#0056b3"
        };
      }
    }

    // Get recent cart abandonment logs
    let recentLogs = [];
    try {
      recentLogs = await prisma.cartAbandonmentLog.findMany({
        where: { shopDomain: session.shop },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    } catch (logError) {
      console.warn("⚠️ Could not load recent logs:", logError.message);
    }

    console.log("✅ Cart abandonment test data loaded:", { 
      hasSettings: !!settings, 
      cartAbandonmentEnabled: settings?.cartAbandonmentEnabled,
      logsCount: recentLogs.length 
    });
    
    return json({ 
      settings, 
      shopDomain: session.shop,
      recentLogs,
      success: true
    });
  } catch (error) {
    console.error("❌ Critical error loading cart abandonment test data:", error);
    
    // Return fallback data instead of failing completely
    return json({ 
      settings: {
        shopDomain: session.shop,
        isEnabled: true,
        cartAbandonmentEnabled: false,
        cartAbandonmentDiscount: 10,
        cartAbandonmentDelay: 300,
        cartAbandonmentMessage: "Don't miss out! Complete your purchase and get {discount}% off!",
        primaryColor: "#007bff",
        secondaryColor: "#0056b3"
      }, 
      shopDomain: session.shop,
      recentLogs: [],
      error: error.message || "Failed to load data",
      fallback: true
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default function CartAbandonmentTest() {
  const { settings, shopDomain, recentLogs } = useLoaderData();
  const [testSessionId, setTestSessionId] = useState(`test-${Date.now()}`);
  const [testCustomerId, setTestCustomerId] = useState("");
  const [testCartTotal, setTestCartTotal] = useState("99.99");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/cart-abandonment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: testSessionId,
          shop_domain: shopDomain,
          customer_id: testCustomerId || null,
          cart_total: testCartTotal
        }),
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        data: result,
        status: response.status
      });
    } catch (error) {
      setTestResult({
        success: false,
        data: { error: error.message },
        status: 500
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  if (!settings) {
    return (
      <Page title="Cart Abandonment Recovery - Test">
        <Banner status="critical">
          <Text>Unable to load widget settings. Please check your configuration.</Text>
        </Banner>
      </Page>
    );
  }

  return (
    <Page title="Cart Abandonment Recovery - Test">
      <Layout>
        <Layout.Section>
          <Banner status="info">
            <Text variant="headingSm" as="h3">Cart Abandonment Recovery Testing</Text>
            <Text>This page allows you to test your cart abandonment recovery feature. Use this to verify your settings work correctly before going live.</Text>
          </Banner>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">🛒 Current Settings</Text>
              
              <InlineStack gap="200" align="space-between">
                <Text>Status:</Text>
                <Badge status={settings.cartAbandonmentEnabled ? "success" : "critical"}>
                  {settings.cartAbandonmentEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </InlineStack>

              {settings.cartAbandonmentEnabled && (
                <BlockStack gap="200">
                  <InlineStack gap="200" align="space-between">
                    <Text>Discount:</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{settings.cartAbandonmentDiscount}%</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200" align="space-between">
                    <Text>Delay:</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{settings.cartAbandonmentDelay} seconds</Text>
                  </InlineStack>
                  
                  <div>
                    <Text variant="bodyMd" fontWeight="semibold">Message:</Text>
                    <Text variant="bodySm" color="subdued">{settings.cartAbandonmentMessage}</Text>
                  </div>
                </BlockStack>
              )}

              {!settings.cartAbandonmentEnabled && (
                <Banner status="warning">
                  <Text>Cart abandonment recovery is disabled. Enable it in Widget Settings to test this feature.</Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">🧪 Test Cart Abandonment</Text>
              
              <FormLayout>
                <TextField
                  label="Test Session ID"
                  value={testSessionId}
                  onChange={setTestSessionId}
                  helpText="Unique identifier for this test session"
                />
                
                <TextField
                  label="Customer ID (Optional)"
                  value={testCustomerId}
                  onChange={setTestCustomerId}
                  helpText="Leave empty for anonymous customer testing"
                />
                
                <TextField
                  label="Cart Total"
                  value={testCartTotal}
                  onChange={setTestCartTotal}
                  prefix="$"
                  helpText="Simulated cart value for testing"
                />
                
                <Button 
                  primary 
                  onClick={runTest} 
                  loading={isLoading}
                  disabled={!settings.cartAbandonmentEnabled}
                >
                  Test Cart Abandonment
                </Button>
              </FormLayout>

              {testResult && (
                <Banner status={testResult.success ? "success" : "critical"}>
                  <BlockStack gap="200">
                    <Text variant="headingSm">
                      Test Result ({testResult.status})
                    </Text>
                    
                    {testResult.success ? (
                      <BlockStack gap="100">
                        <Text><strong>✅ Success!</strong></Text>
                        <Text><strong>Discount Code:</strong> {testResult.data.discount_code}</Text>
                        <Text><strong>Discount:</strong> {testResult.data.discount_percentage}%</Text>
                        <Text><strong>Message:</strong> {testResult.data.message}</Text>
                      </BlockStack>
                    ) : (
                      <BlockStack gap="100">
                        <Text><strong>❌ Failed</strong></Text>
                        <Text><strong>Error:</strong> {testResult.data.error}</Text>
                        {testResult.data.details && (
                          <Text variant="bodySm" color="subdued">
                            Details: {JSON.stringify(testResult.data.details, null, 2)}
                          </Text>
                        )}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">📊 Recent Activity</Text>
              
              {recentLogs.length > 0 ? (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {recentLogs.map((log, index) => (
                    <div key={log.id} style={{ 
                      padding: "12px", 
                      border: "1px solid #e1e5e9", 
                      borderRadius: "8px",
                      marginBottom: index < recentLogs.length - 1 ? "8px" : "0"
                    }}>
                      <InlineStack gap="400" align="space-between">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="semibold">
                            Code: {log.discountCode}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {log.discountPercentage}% discount • Session: {log.sessionId}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {formatDateTime(log.createdAt)}
                          </Text>
                        </BlockStack>
                        <Badge status={log.used ? "success" : "info"}>
                          {log.used ? "Used" : "Active"}
                        </Badge>
                      </InlineStack>
                    </div>
                  ))}
                </div>
              ) : (
                <Text color="subdued">No cart abandonment activity yet. Run a test to see results here.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">🔍 How to Test in Your Store</Text>
              
              <List type="number">
                <List.Item>
                  <strong>Enable the feature:</strong> Go to Widget Settings and enable Cart Abandonment Recovery with your desired discount percentage.
                </List.Item>
                <List.Item>
                  <strong>Add items to cart:</strong> Visit your store and add some products to your cart.
                </List.Item>
                <List.Item>
                  <strong>Start a chat:</strong> Open the chatbot widget and start a conversation.
                </List.Item>
                <List.Item>
                  <strong>Wait for delay:</strong> After the configured delay time (default 5 minutes), the bot will automatically offer a discount.
                </List.Item>
                <List.Item>
                  <strong>Verify discount:</strong> The bot should provide a working discount code that customers can use at checkout.
                </List.Item>
              </List>

              <Banner status="info">
                <Text>
                  <strong>Note:</strong> Each customer can only receive one discount code per hour to prevent abuse. 
                  The discount codes are automatically created in your Shopify admin and are valid for single use.
                </Text>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
