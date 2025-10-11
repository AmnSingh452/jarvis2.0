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

                {/* Plan Usage Section */}
                {analyticsData?.planUsage && (
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text variant="headingMd">
                          {analyticsData.planUsage.isTrial ? "🎁 Free Trial Status" : "📊 Plan Usage"}
                        </Text>
                        <Badge status={
                          analyticsData.planUsage.trialExpired ? "critical" :
                          analyticsData.planUsage.isTrial ? "info" :
                          analyticsData.planUsage.isUnlimited ? "success" : "info"
                        }>
                          {analyticsData.planUsage.planName}
                        </Badge>
                      </InlineStack>
                      
                      {analyticsData.planUsage.trialExpired ? (
                        <BlockStack gap="200">
                          <Text variant="bodyMd" tone="critical">
                            ⚠️ Your 14-day free trial has ended!
                          </Text>
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Trial duration</Text>
                            <Badge status="critical">{analyticsData.planUsage.daysInTrial} days used</Badge>
                          </InlineStack>
                          <Text variant="bodySm" color="subdued">
                            Subscribe to continue using Jarvis AI chatbot. Choose Essential ($19/month) or Sales Pro ($49/month) to reactivate your widget.
                          </Text>
                          <Button variant="primary" url="/app/billing_v2">
                            Choose Your Plan
                          </Button>
                        </BlockStack>
                      ) : analyticsData.planUsage.isTrial ? (
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Days remaining</Text>
                            <Badge status={analyticsData.planUsage.trialDaysRemaining <= 3 ? "warning" : "info"}>
                              {analyticsData.planUsage.trialDaysRemaining} days left
                            </Badge>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Conversations used</Text>
                            <Badge status="success">{analyticsData.planUsage.conversationsUsed}</Badge>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Trial limit</Text>
                            <Badge status="success">Unlimited</Badge>
                          </InlineStack>
                          <Text variant="bodySm" color="subdued">
                            🎉 Enjoy unlimited conversations during your free trial! 
                            {analyticsData.planUsage.trialDaysRemaining <= 3 && 
                              " Your trial ends soon - choose a plan to continue."}
                          </Text>
                          {analyticsData.planUsage.trialDaysRemaining <= 7 && (
                            <Button variant="primary" url="/app/billing_v2">
                              Subscribe Now & Save
                            </Button>
                          )}
                        </BlockStack>
                      ) : analyticsData.planUsage.isUnlimited ? (
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Conversations this month</Text>
                            <Badge status="success">{analyticsData.planUsage.conversationsUsed}</Badge>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Monthly limit</Text>
                            <Badge status="success">Unlimited</Badge>
                          </InlineStack>
                          <Text variant="bodySm" color="subdued">
                            🎉 You're on the Sales Pro plan with unlimited conversations!
                          </Text>
                        </BlockStack>
                      ) : (
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Conversations used</Text>
                            <Badge status={analyticsData.planUsage.usagePercentage > 90 ? "critical" : 
                                         analyticsData.planUsage.usagePercentage > 75 ? "warning" : "info"}>
                              {analyticsData.planUsage.conversationsUsed} / {analyticsData.planUsage.conversationsLimit}
                            </Badge>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Remaining</Text>
                            <Badge status={analyticsData.planUsage.conversationsRemaining < 100 ? "warning" : "success"}>
                              {analyticsData.planUsage.conversationsRemaining}
                            </Badge>
                          </InlineStack>
                          <div style={{ width: '100%' }}>
                            <Text variant="bodySm" color="subdued">Usage: {analyticsData.planUsage.usagePercentage}%</Text>
                            <div style={{ 
                              width: '100%', 
                              backgroundColor: '#f0f0f0', 
                              borderRadius: '4px', 
                              height: '8px', 
                              marginTop: '4px' 
                            }}>
                              <div style={{ 
                                width: `${analyticsData.planUsage.usagePercentage}%`, 
                                backgroundColor: analyticsData.planUsage.usagePercentage > 90 ? '#d73a49' : 
                                                analyticsData.planUsage.usagePercentage > 75 ? '#f66a0a' : '#28a745',
                                height: '100%', 
                                borderRadius: '4px' 
                              }} />
                            </div>
                          </div>
                          {analyticsData.planUsage.usagePercentage > 85 && (
                            <Text variant="bodySm" tone={analyticsData.planUsage.usagePercentage > 95 ? "critical" : "warning"}>
                              {analyticsData.planUsage.usagePercentage > 95 ? 
                                "⚠️ Almost at your monthly limit! Consider upgrading to Sales Pro for unlimited conversations." :
                                "📈 You're using most of your monthly conversations. Upgrade to Sales Pro for unlimited access."}
                            </Text>
                          )}
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Card>
                )}
                
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
                        <Text variant="bodyMd" color="subdued">Unique Visitors</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.uniqueVisitors || "0"}</Text>
                        {analyticsData?.overview?.uniqueVisitors > 0 && (
                          <Badge status="info">Visitors tracked</Badge>
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
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Active Sessions</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.activeSessions || "0"}</Text>
                        {analyticsData?.overview?.activeSessions > 0 && (
                          <Badge status="attention">Live now</Badge>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Avg Session Duration</Text>
                        <Text variant="heading2xl">{analyticsData?.overview?.avgSessionDuration || "0"}m</Text>
                        {analyticsData?.overview?.avgSessionDuration > 2 && (
                          <Badge status="success">Engaging</Badge>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>

            {/* New Section: Conversation Activity & Trends */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg">📊 Conversation Activity & Trends</Text>
                
                <Grid>
                  <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text variant="headingMd">🕒 Recent Activity</Text>
                        {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                          <BlockStack gap="200">
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">Last 24 hours</Text>
                              <Badge status="info">{analyticsData.overview.conversationsLast24h || 0} conversations</Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">Peak hours</Text>
                              <Badge>
                                {analyticsData.overview.conversationsLast24h > 5 ? "High activity" : 
                                 analyticsData.overview.conversationsLast24h > 0 ? "Moderate activity" : "Low activity"}
                              </Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">Active now</Text>
                              <Badge status="success">{analyticsData.overview.activeSessions || 0} sessions</Badge>
                            </InlineStack>
                          </BlockStack>
                        ) : (
                          <Text variant="bodyMd" color="subdued">
                            Activity patterns will show here once conversations begin
                          </Text>
                        )}
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text variant="headingMd">📈 Engagement Patterns</Text>
                        {analyticsData && analyticsData.overview.totalConversations > 0 ? (
                          <BlockStack gap="200">
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">Returning visitors</Text>
                              <Badge status="success">{analyticsData.overview.returningVisitorsPercentage || 0}%</Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">Avg messages per session</Text>
                              <Badge>{analyticsData.overview.messagesPerSession || 0}</Badge>
                            </InlineStack>
                            <InlineStack align="space-between">
                              <Text variant="bodyMd">User satisfaction</Text>
                              <Badge status="success">
                                {analyticsData.overview.responseRate > 80 ? "High" : 
                                 analyticsData.overview.responseRate > 60 ? "Good" : "Improving"}
                              </Badge>
                            </InlineStack>
                          </BlockStack>
                        ) : (
                          <Text variant="bodyMd" color="subdued">
                            Engagement insights will appear with user interactions
                          </Text>
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
                      <BlockStack gap="300">
                        <List type="bullet">
                          <List.Item>
                            <strong>Engagement:</strong> You have {analyticsData.overview.totalConversations} total conversations with a {analyticsData.overview.responseRate}% response rate.
                          </List.Item>
                          <List.Item>
                            <strong>Performance:</strong> Average response time is {analyticsData.overview.avgResponseTime} seconds - {analyticsData.overview.avgResponseTime < 3 ? 'excellent speed!' : 'consider optimizing response times.'}
                          </List.Item>
                          <List.Item>
                            <strong>Sessions:</strong> {analyticsData.overview.activeSessions || 0} active sessions with an average duration of {analyticsData.overview.avgSessionDuration || 0} minutes.
                          </List.Item>
                          <List.Item>
                            <strong>Reach:</strong> {analyticsData.overview.uniqueVisitors || 0} unique visitors have interacted with your chatbot.
                          </List.Item>
                        </List>
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="semibold">💡 Smart Recommendations:</Text>
                          <List type="bullet">
                            <List.Item>
                              {analyticsData.overview.responseRate > 80 ? 
                                'Your response rate is excellent! Consider expanding chatbot capabilities.' :
                                'Improve response rate by adding more training data or FAQs.'}
                            </List.Item>
                            <List.Item>
                              {parseFloat(analyticsData.overview.avgSessionDuration) > 3 ? 
                                'Great engagement! Users are having meaningful conversations.' :
                                'Boost engagement with more interactive conversation flows.'}
                            </List.Item>
                          </List>
                        </BlockStack>
                      </BlockStack>
                    ) : (
                      <BlockStack gap="300">
                        <Text variant="bodyMd">
                          Start getting customer interactions to see AI-powered insights and recommendations here.
                        </Text>
                        <List type="bullet">
                          <List.Item>📊 Performance analytics</List.Item>
                          <List.Item>🎯 Engagement optimization tips</List.Item>
                          <List.Item>💡 Smart conversation improvements</List.Item>
                          <List.Item>📈 Growth recommendations</List.Item>
                        </List>
                      </BlockStack>
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
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Unique Visitors</Text>
                          <Badge status="info">{analyticsData.overview.uniqueVisitors || 0}</Badge>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Session Duration</Text>
                          <Badge status={parseFloat(analyticsData.overview.avgSessionDuration) > 3 ? "success" : "attention"}>
                            {analyticsData.overview.avgSessionDuration || 0}min
                          </Badge>
                        </InlineStack>
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="semibold">📊 Trend Analysis:</Text>
                          <Text variant="bodyMd" color="subdued">
                            {analyticsData.overview.responseRate > 90 ? 
                              '🔥 Outstanding performance! Your chatbot is highly effective.' :
                              analyticsData.overview.responseRate > 70 ?
                              '✅ Good performance with room for optimization.' :
                              '⚠️ Consider improving response accuracy and coverage.'}
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    ) : (
                      <BlockStack gap="300">
                        <Text variant="bodyMd">
                          Growth metrics will be calculated once you have customer conversations.
                        </Text>
                        <List type="bullet">
                          <List.Item>📈 Conversation growth tracking</List.Item>
                          <List.Item>👥 Visitor engagement metrics</List.Item>
                          <List.Item>⏱️ Session duration analysis</List.Item>
                          <List.Item>🎯 Performance trends</List.Item>
                        </List>
                      </BlockStack>
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
                      <BlockStack gap="300">
                        <List type="bullet">
                          <List.Item>
                            <strong>Response Time:</strong> {analyticsData.overview.avgResponseTime < 2 ? "Great response time! " : "Consider optimizing response speed. "}
                            Current average: {analyticsData.overview.avgResponseTime}s
                          </List.Item>
                          <List.Item>
                            <strong>Engagement:</strong> {analyticsData.overview.responseRate > 80 ? "Excellent engagement rate! " : "Work on improving response rate. "}
                            Current rate: {analyticsData.overview.responseRate}%
                          </List.Item>
                          <List.Item>
                            <strong>Session Quality:</strong> {parseFloat(analyticsData.overview.avgSessionDuration) > 3 ? "Users are highly engaged! " : "Try to increase conversation depth. "}
                            Average duration: {analyticsData.overview.avgSessionDuration}min
                          </List.Item>
                        </List>
                        
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="semibold">🚀 Quick Wins:</Text>
                          <List type="bullet">
                            <List.Item>Add greeting messages to increase engagement</List.Item>
                            <List.Item>Train on common product questions</List.Item>
                            <List.Item>Set up quick reply buttons for popular queries</List.Item>
                            <List.Item>Monitor and respond to unresolved questions</List.Item>
                          </List>
                        </BlockStack>
                      </BlockStack>
                    ) : (
                      <BlockStack gap="300">
                        <Text variant="bodyMd">
                          Personalized optimization recommendations will appear here based on your chatbot's performance data.
                        </Text>
                        <List type="bullet">
                          <List.Item>🎯 Response accuracy improvements</List.Item>
                          <List.Item>⚡ Speed optimization tips</List.Item>
                          <List.Item>💬 Engagement enhancement strategies</List.Item>
                          <List.Item>📚 Training data suggestions</List.Item>
                        </List>
                      </BlockStack>
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
