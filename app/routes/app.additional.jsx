import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function AdditionalPage() {
  return (
    <Page>
      <TitleBar title="Additional Features" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingLg">
                Advanced Features & Integrations
              </Text>
              <Text as="p" variant="bodyMd">
                Explore the advanced capabilities of Jarvis AI Assistant. This page demonstrates how to create multiple pages within app navigation using{" "}
                <Link
                  url="https://shopify.dev/docs/apps/tools/app-bridge"
                  target="_blank"
                  removeUnderline
                >
                  App Bridge
                </Link>
                .
              </Text>
              
              {/* Quick Navigation */}
              <Card background="bg-surface-secondary">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    🚀 Quick Navigation
                  </Text>
                  <InlineStack gap="200" wrap={false}>
                    <Button url="/app" variant="secondary">
                      ← Dashboard
                    </Button>
                    <Button url="/app/widget-settings" variant="secondary">
                      Widget Settings
                    </Button>
                    <Button url="/app/billing_v2" variant="secondary">
                      Billing & Plans
                    </Button>
                    <Button url="/app/welcome" variant="secondary">
                      Welcome Guide
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Features Grid */}
              <Layout>
                <Layout.Section variant="oneHalf">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        🤖 AI Capabilities
                      </Text>
                      <List>
                        <List.Item>Natural language processing</List.Item>
                        <List.Item>Product recommendations</List.Item>
                        <List.Item>Customer support automation</List.Item>
                        <List.Item>Order status inquiries</List.Item>
                        <List.Item>FAQ handling</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneHalf">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        🔧 Customization Options
                      </Text>
                      <List>
                        <List.Item>Custom color schemes</List.Item>
                        <List.Item>Branded messaging</List.Item>
                        <List.Item>Widget positioning</List.Item>
                        <List.Item>Response templates</List.Item>
                        <List.Item>Multilingual support</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneHalf">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        📊 Analytics & Insights
                      </Text>
                      <List>
                        <List.Item>Conversation analytics</List.Item>
                        <List.Item>Customer satisfaction metrics</List.Item>
                        <List.Item>Response time tracking</List.Item>
                        <List.Item>Popular query analysis</List.Item>
                        <List.Item>Conversion tracking</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section variant="oneHalf">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        🔗 Integrations
                      </Text>
                      <List>
                        <List.Item>Shopify Admin API</List.Item>
                        <List.Item>Customer service platforms</List.Item>
                        <List.Item>Email marketing tools</List.Item>
                        <List.Item>Social media channels</List.Item>
                        <List.Item>Third-party apps</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>
              
              <Text as="p" variant="bodyMd">
                To create your own page and have it show up in the app
                navigation, add a page inside <Code>app/routes</Code>, and a
                link to it in the <Code>&lt;NavMenu&gt;</Code> component found
                in <Code>app/routes/app.jsx</Code>.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Resources
              </Text>
              <List>
                <List.Item>
                  <Link
                    url="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
                    target="_blank"
                    removeUnderline
                  >
                    App nav best practices
                  </Link>
                </List.Item>
                <List.Item>
                  <Link
                    url="https://shopify.dev/docs/apps/tools/app-bridge"
                    target="_blank"
                    removeUnderline
                  >
                    App Bridge documentation
                  </Link>
                </List.Item>
                <List.Item>
                  <Link
                    url="https://polaris.shopify.com"
                    target="_blank"
                    removeUnderline
                  >
                    Polaris design system
                  </Link>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Need Help?
              </Text>
              <Text as="p" variant="bodyMd">
                Check out the welcome guide for step-by-step instructions or configure your widget settings to get started.
              </Text>
              <InlineStack gap="200">
                <Button url="/app/welcome" variant="primary">
                  Welcome Guide
                </Button>
                <Button url="/app/widget-settings" variant="secondary">
                  Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function Code({ children }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}
