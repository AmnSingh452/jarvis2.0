import { Card, Spinner, Text, BlockStack, Box } from "@shopify/polaris";

export function LoadingCard({ title = "Loading...", description }) {
  return (
    <Card>
      <Box padding="800">
        <BlockStack gap="400" align="center">
          <Spinner accessibilityLabel="Loading" size="large" />
          <Text variant="headingMd" alignment="center">
            {title}
          </Text>
          {description && (
            <Text variant="bodyMd" alignment="center" tone="subdued">
              {description}
            </Text>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

export function LoadingPage({ title = "Loading your app..." }) {
  return (
    <Box padding="800">
      <BlockStack gap="800" align="center">
        <Spinner accessibilityLabel="Loading application" size="large" />
        <BlockStack gap="200" align="center">
          <Text variant="headingLg" alignment="center">
            {title}
          </Text>
          <Text variant="bodyMd" alignment="center" tone="subdued">
            Please wait while we prepare your dashboard...
          </Text>
        </BlockStack>
      </BlockStack>
    </Box>
  );
}
