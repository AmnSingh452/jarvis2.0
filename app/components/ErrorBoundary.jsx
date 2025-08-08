import { Component } from "react";
import { Card, Text, Button, BlockStack, Box } from "@shopify/polaris";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box padding="400">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" tone="critical">
                Something went wrong
              </Text>
              <Text>
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </Text>
              {process.env.NODE_ENV === 'development' && (
                <Box padding="200" background="bg-surface-critical-subdued">
                  <Text variant="bodyMd" fontWeight="bold">
                    Error: {this.state.error?.message}
                  </Text>
                  <Text variant="bodySm">
                    {this.state.errorInfo?.componentStack}
                  </Text>
                </Box>
              )}
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Refresh Page
              </Button>
            </BlockStack>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}
