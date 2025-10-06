import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  DataTable,
  EmptyState,
  Button,
  ButtonGroup,
  Select,
  Spinner,
  Banner,
  List,
  Divider,
  Box,
  BlockStack,
  InlineStack,
  Grid
} from "@shopify/polaris";
import { useState, useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "aman-chatbot-test.myshopify.com";
  
  return json({
    shop: shop
  });
};

export default function Analytics() {
  const { shop } = useLoaderData();
  const fetcher = useFetcher();
  const [timeRange, setTimeRange] = useState("30");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/analytics-data?shop=${shop}&days=${timeRange}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError(err.message);
        // No fallback data - show only real data for Shopify compliance
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [shop, timeRange]);

  const timeRangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" }
  ];

  const conversationRows = analyticsData?.recentConversations?.map(conv => [
    conv.customer,
    conv.topic,
    conv.timestamp,
    <Badge status={conv.status === "Converted" ? "success" : conv.status === "Active" ? "info" : ""}>{conv.status}</Badge>,
    <Badge status={conv.satisfaction.includes("Positive") ? "success" : ""}>{conv.satisfaction}</Badge>
  ]) || [];

  const questionRows = analyticsData?.topQuestions?.map(q => [
    q.question,
    q.count.toString()
  ]) || [];

  if (loading) {
    return (
      <Page title="Analytics & Insights">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center">
                  <Spinner size="large" />
                  <Text variant="bodyMd">Loading analytics data...</Text>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page 
      title="Analytics & Insights"
      subtitle="Track your chatbot performance and customer engagement"
      primaryAction={{
        content: "Export Report",
        onAction: () => console.log("Export report")
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {error && (
              <Banner
                title="No Analytics Data Available"
                status="info"
                onDismiss={() => setError(null)}
              >
                <p>Analytics will be available once customers start interacting with your chatbot. Install the widget and start getting real customer conversations to see live data here.</p>
              </Banner>
            )}

            {!analyticsData && !loading && !error && (
              <Banner
                title="Welcome to Analytics"
                status="info"
              >
                <p>Your analytics dashboard is ready! Once customers start using your chatbot, you'll see real conversation data, metrics, and insights here.</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Performance Overview</Text>
                  <Select
                    options={timeRangeOptions}
                    value={timeRange}
                    onChange={setTimeRange}
                  />
                </InlineStack>
                
                <Grid>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Total Conversations</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.totalConversations || "0"}</Text>
                        {analyticsData?.overview?.totalConversations > 0 && (
                          <Badge status="info">Active tracking</Badge>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Response Rate</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.responseRate || "0"}%</Text>
                        {analyticsData?.overview?.responseRate > 80 && (
                          <Badge status="success">Excellent</Badge>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Avg Response Time</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.avgResponseTime || "0"}s</Text>
                        {analyticsData?.overview?.avgResponseTime > 0 && analyticsData?.overview?.avgResponseTime < 3 && (
                          <Badge status="success">Fast response</Badge>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>

            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">🎯 AI Insights & Recommendations</Text>
                    {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                      <List type="bullet">
                        <List.Item>
                          <strong>Engagement:</strong> You have {analyticsData.overview.totalConversations} total conversations with a {analyticsData.overview.responseRate}% response rate.
                        </List.Item>
                        <List.Item>
                          <strong>Performance:</strong> Average response time is {analyticsData.overview.avgResponseTime} seconds.
                        </List.Item>
                      </List>
                    ) : (
                      <Text variant="bodyMd">
                        Start getting customer interactions to see AI-powered insights and recommendations here.
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">📈 Growth Metrics</Text>
                    {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Total Conversations</Text>
                          <Badge>{analyticsData.overview.totalConversations}</Badge>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Response Rate</Text>
                          <Badge status="success">{analyticsData.overview.responseRate}%</Badge>
                        </InlineStack>
                      </BlockStack>
                    ) : (
                      <Text variant="bodyMd">
                        Growth metrics will be calculated once you have customer conversations.
                      </Text>
                    )}
                    
                    <Divider />
                    
                    <BlockStack gap="200">
                      <Text variant="bodyMd" tone="success">
                        <strong>🎖️ Performance Rating</strong>
                      </Text>
                      {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                        <>
                          <Text variant="headingLg">Active</Text>
                          <Text variant="bodySm">
                            Your chatbot is actively handling conversations with a {analyticsData.overview.responseRate}% response rate.
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text variant="headingLg">Getting Started</Text>
                          <Text variant="bodySm">
                            Performance rating will appear here based on conversation metrics and response times.
                          </Text>
                        </>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">💡 Optimization Tips</Text>
                    {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                      <List type="bullet">
                        <List.Item>
                          <strong>Response Time:</strong> {analyticsData.overview.avgResponseTime < 2 ? "Great response time! " : "Consider optimizing response speed. "}
                          Current average: {analyticsData.overview.avgResponseTime}s
                        </List.Item>
                        <List.Item>
                          <strong>Engagement:</strong> {analyticsData.overview.responseRate > 80 ? "Excellent engagement rate! " : "Work on improving response rate. "}
                          Current rate: {analyticsData.overview.responseRate}%
                        </List.Item>
                      </List>
                    ) : (
                      <Text variant="bodyMd">
                        Personalized optimization recommendations will appear here based on your chatbot's performance data.
                      </Text>
                    )}
                    
                    <Divider />
                    
                    <ButtonGroup>
                      <Button size="slim" variant="primary" url="/app/widget-settings">
                        Optimize Settings
                      </Button>
                      <Button size="slim" url="/app/billing_v2">
                        Upgrade Plan
                      </Button>
                    </ButtonGroup>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">🔥 Most Asked Questions</Text>
                    {questionRows.length > 0 ? (
                      <DataTable
                        columnContentTypes={['text', 'numeric']}
                        headings={['Question', 'Count']}
                        rows={questionRows}
                      />
                    ) : (
                      <EmptyState
                        heading="No questions data yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>Questions will appear here as customers interact with your chatbot.</p>
                      </EmptyState>
                    )}
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">💬 Recent Conversations</Text>
                    {conversationRows.length > 0 ? (
                      <DataTable
                        columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                        headings={['Customer', 'Topic', 'Time', 'Status', 'Satisfaction']}
                        rows={conversationRows}
                      />
                    ) : (
                      <EmptyState
                        heading="No conversations yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>Recent conversations will appear here as customers use your chatbot.</p>
                      </EmptyState>
                    )}
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
