import { Link } from "@remix-run/react";
import { Card, Layout, Page, Text, BlockStack } from "@shopify/polaris";

export default function LegalIndex() {
  return (
    <Page title="Legal Documentation">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingLg" as="h2">
                  Privacy Policy
                </Text>
                <Text as="p">
                  Learn how we collect, use, and protect your data and your customers' information.
                </Text>
                <Link to="/legal/privacy-policy" target="_blank">
                  View Privacy Policy →
                </Link>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingLg" as="h2">
                  Support Documentation
                </Text>
                <Text as="p">
                  Comprehensive help center with FAQs, troubleshooting guides, and tutorials.
                </Text>
                <Link to="/legal/support" target="_blank">
                  View Support Center →
                </Link>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingLg" as="h2">
                  Terms of Service
                </Text>
                <Text as="p">
                  Understand the terms and conditions for using Jarvis 2.0 AI Chatbot.
                </Text>
                <Link to="/legal/terms-of-service" target="_blank">
                  View Terms of Service →
                </Link>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
