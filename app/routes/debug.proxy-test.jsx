import { useState } from "react";
import { Page, Layout, Card, Text, Button, TextField, BlockStack, Banner, InlineStack, Badge } from "@shopify/polaris";

export default function ProxyDebugPage() {
  const [testUrl, setTestUrl] = useState("https://your-shop.myshopify.com/a/jarvis/test");
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testProxyEndpoint = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page title="App Proxy Debug Tool">
      <Layout>
        <Layout.Section>
          <Banner status="info">
            <Text as="p">
              This tool helps you test your Shopify app proxy configuration. Make sure you've:
            </Text>
            <Text as="p">
              1. Added the app proxy configuration to your Shopify app in Partners dashboard
            </Text>
            <Text as="p">
              2. Deployed your app with the updated configuration
            </Text>
            <Text as="p">
              3. Replaced "your-shop" with your actual shop domain
            </Text>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd">App Proxy Configuration</Text>
              
              <BlockStack gap="2">
                <Text as="dt" variant="headingSm">Expected Configuration:</Text>
                <Text as="dd" color="subdued">URL: https://jarvis2-0-djg1.onrender.com/</Text>
                <Text as="dd" color="subdued">Subpath: jarvis</Text>
                <Text as="dd" color="subdued">Prefix: a</Text>
              </BlockStack>

              <BlockStack gap="2">
                <Text as="dt" variant="headingSm">Test URLs:</Text>
                <Text as="dd" color="subdued">Direct: https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/test</Text>
                <Text as="dd" color="subdued">Via Proxy: https://your-shop.myshopify.com/a/jarvis/test</Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd">Test Proxy Endpoint</Text>
              
              <TextField
                label="Test URL"
                value={testUrl}
                onChange={setTestUrl}
                placeholder="https://your-shop.myshopify.com/a/jarvis/test"
                helpText="Replace 'your-shop' with your actual shop domain"
              />

              <InlineStack gap="2">
                <Button 
                  primary 
                  loading={isLoading} 
                  onClick={testProxyEndpoint}
                >
                  Test Proxy
                </Button>
                <Button 
                  onClick={() => setTestUrl("https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/test")}
                >
                  Test Direct
                </Button>
              </InlineStack>

              {testResult && (
                <Card>
                  <BlockStack gap="3">
                    <InlineStack gap="2" align="start">
                      <Badge status={testResult.success ? "success" : "critical"}>
                        {testResult.success ? "SUCCESS" : "FAILED"}
                      </Badge>
                      {testResult.status && (
                        <Badge status={testResult.status === 200 ? "success" : "warning"}>
                          {testResult.status}
                        </Badge>
                      )}
                    </InlineStack>

                    {testResult.success && testResult.data && (
                      <BlockStack gap="2">
                        <Text variant="headingSm">Response:</Text>
                        <Text as="p" color="subdued">{testResult.data.message}</Text>
                        {testResult.data.proxy_status && (
                          <Text as="p">Status: {testResult.data.proxy_status}</Text>
                        )}
                      </BlockStack>
                    )}

                    {testResult.error && (
                      <BlockStack gap="2">
                        <Text variant="headingSm" color="critical">Error:</Text>
                        <Text as="p" color="critical">{testResult.error}</Text>
                      </BlockStack>
                    )}

                    <Text variant="bodySm" color="subdued">
                      Tested at: {testResult.timestamp}
                    </Text>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd">Troubleshooting</Text>
              
              <BlockStack gap="3">
                <Banner status="warning">
                  <Text as="p" variant="headingSm">If you're getting HTML instead of JSON:</Text>
                  <Text as="p">1. Check that the app proxy is configured in Shopify Partners dashboard</Text>
                  <Text as="p">2. Verify the URL, subpath, and prefix match your configuration</Text>
                  <Text as="p">3. Make sure your app is deployed and accessible</Text>
                </Banner>

                <Banner status="info">
                  <Text as="p" variant="headingSm">Expected JSON Response:</Text>
                  <Text as="p">{"{"}"success": true, "message": "🎉 Shopify App Proxy is working!", ...{"}"}</Text>
                </Banner>

                <Banner status="critical">
                  <Text as="p" variant="headingSm">If you're getting errors:</Text>
                  <Text as="p">1. Check your network connection</Text>
                  <Text as="p">2. Verify the shop domain is correct</Text>
                  <Text as="p">3. Make sure your app is installed on the shop</Text>
                </Banner>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
