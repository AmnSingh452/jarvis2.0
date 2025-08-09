import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Select,
  Grid,
  Box,
  Badge,
  DataTable,
  Button,
  InlineStack,
  BlockStack,
  Divider,
  Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  // In a real implementation, you'd fetch this from your database
  // For now, let's create realistic demo data that scales for multiple clients
  const shopDomain = session.shop;
  
  // Get date range (last 30 days for demo)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  // Demo analytics data - in production, fetch from database
  const analytics = {
    overview: {
      totalConversations: Math.floor(Math.random() * 500) + 200,
      uniqueVisitors: Math.floor(Math.random() * 300) + 150,
      responseRate: (Math.random() * 20 + 80).toFixed(1), // 80-100%
      avgResponseTime: (Math.random() * 2 + 1).toFixed(1), // 1-3 seconds
      customerSatisfaction: (Math.random() * 10 + 90).toFixed(1), // 90-100%
      conversionsGenerated: Math.floor(Math.random() * 50) + 10,
      revenueGenerated: (Math.random() * 5000 + 1000).toFixed(2)
    },
    timeData: generateTimeSeriesData(30), // Last 30 days
    topQuestions: [
      { question: "What are your shipping options?", count: Math.floor(Math.random() * 50) + 20 },
      { question: "How do I return an item?", count: Math.floor(Math.random() * 40) + 15 },
      { question: "What payment methods do you accept?", count: Math.floor(Math.random() * 35) + 12 },
      { question: "Is this product in stock?", count: Math.floor(Math.random() * 30) + 10 },
      { question: "Can I track my order?", count: Math.floor(Math.random() * 25) + 8 }
    ],
    recentConversations: [
      { 
        id: 1, 
        customer: "Anonymous Customer", 
        topic: "Product Inquiry", 
        timestamp: "2 hours ago",
        status: "Resolved",
        satisfaction: "Positive"
      },
      { 
        id: 2, 
        customer: "Returning Customer", 
        topic: "Shipping Question", 
        timestamp: "4 hours ago",
        status: "Resolved",
        satisfaction: "Positive"
      },
      { 
        id: 3, 
        customer: "New Visitor", 
        topic: "Product Recommendation", 
        timestamp: "6 hours ago",
        status: "Converted",
        satisfaction: "Very Positive"
      }
    ],
    shopDomain,
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  };

  return json(analytics);
}

// Helper function to generate realistic time series data
function generateTimeSeriesData(days) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic conversation data with some trends
    const baseConversations = 15;
    const trend = Math.sin((i / days) * Math.PI * 2) * 5; // Sine wave for variation
    const randomVariation = (Math.random() - 0.5) * 8;
    const conversations = Math.max(0, Math.floor(baseConversations + trend + randomVariation));
    
    data.push({
      date: date.toISOString().split('T')[0],
      conversations,
      conversions: Math.floor(conversations * (Math.random() * 0.3 + 0.1)), // 10-40% conversion rate
      revenue: Math.floor(conversations * (Math.random() * 50 + 25)) // $25-$75 per conversation
    });
  }
  
  return data;
}

export default function Analytics() {
  const analytics = useLoaderData();
  const [dateRange, setDateRange] = useState("30");
  
  const dateRangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];

  // Format numbers for display
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Page
      title="Analytics Dashboard"
      subtitle={`Performance insights for ${analytics.shopDomain}`}
      secondaryActions={[
        {
          content: 'Export Data',
          accessibilityLabel: 'Export analytics data'
        }
      ]}
    >
      <Layout>
        {/* Date Range Selector */}
        <Layout.Section>
          <Card>
            <InlineStack gap="400" align="space-between">
              <Text variant="headingMd" as="h2">
                📊 Overview
              </Text>
              <Box width="200px">
                <Select
                  label="Date range"
                  options={dateRangeOptions}
                  value={dateRange}
                  onChange={setDateRange}
                />
              </Box>
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Key Metrics */}
        <Layout.Section>
          <Layout>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    💬 Total Conversations
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {formatNumber(analytics.overview.totalConversations)}
                  </Text>
                  <Badge status="success">+12% from last period</Badge>
                </BlockStack>
              </Card>
            </Layout.Section>
            
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    👥 Unique Visitors
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {formatNumber(analytics.overview.uniqueVisitors)}
                  </Text>
                  <Badge status="success">+8% from last period</Badge>
                </BlockStack>
              </Card>
            </Layout.Section>
            
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    ⚡ Response Rate
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {analytics.overview.responseRate}%
                  </Text>
                  <Badge status="success">Excellent</Badge>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Performance Metrics */}
        <Layout.Section>
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    🎯 Performance Metrics
                  </Text>
                  
                  <InlineStack gap="200" align="space-between">
                    <Text variant="bodyMd">Average Response Time</Text>
                    <Badge status="success">{analytics.overview.avgResponseTime}s</Badge>
                  </InlineStack>
                  
                  <InlineStack gap="200" align="space-between">
                    <Text variant="bodyMd">Customer Satisfaction</Text>
                    <Badge status="success">{analytics.overview.customerSatisfaction}%</Badge>
                  </InlineStack>
                  
                  <InlineStack gap="200" align="space-between">
                    <Text variant="bodyMd">Conversions Generated</Text>
                    <Badge>{formatNumber(analytics.overview.conversionsGenerated)}</Badge>
                  </InlineStack>
                  
                  <Divider />
                  
                  <InlineStack gap="200" align="space-between">
                    <Text variant="headingMd">Revenue Generated</Text>
                    <Text variant="headingMd" tone="success">
                      {formatCurrency(analytics.overview.revenueGenerated)}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
            
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    ❓ Top Customer Questions
                  </Text>
                  
                  {analytics.topQuestions.map((item, index) => (
                    <div key={index}>
                      <InlineStack gap="200" align="space-between">
                        <Text variant="bodyMd" truncate>
                          {item.question}
                        </Text>
                        <Badge>{item.count}</Badge>
                      </InlineStack>
                    </div>
                  ))}
                  
                  <Button variant="plain" size="slim">
                    View all questions →
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Recent Activity */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">
                🕒 Recent Conversations
              </Text>
              
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Customer', 'Topic', 'Time', 'Status', 'Satisfaction']}
                rows={analytics.recentConversations.map(conv => [
                  conv.customer,
                  conv.topic,
                  conv.timestamp,
                  <Badge key={conv.id} status={conv.status === 'Converted' ? 'success' : 'info'}>
                    {conv.status}
                  </Badge>,
                  <Badge 
                    key={`satisfaction-${conv.id}`} 
                    status={conv.satisfaction.includes('Positive') ? 'success' : 'warning'}
                  >
                    {conv.satisfaction}
                  </Badge>
                ])}
              />
              
              <InlineStack gap="300">
                <Button>View All Conversations</Button>
                <Button variant="plain">Export Conversation Data</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Insights and Recommendations */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">
                💡 AI Insights & Recommendations
              </Text>
              
              <Banner status="info">
                <p><strong>Peak Hours:</strong> Your chatbot is most active between 2 PM - 6 PM. Consider scheduling promotions during these hours.</p>
              </Banner>
              
              <Banner status="success">
                <p><strong>High Performance:</strong> Shipping questions have a 95% satisfaction rate. Your shipping information is well-received by customers.</p>
              </Banner>
              
              <Banner status="warning">
                <p><strong>Opportunity:</strong> Product recommendation conversations have a 40% higher conversion rate. Consider training your chatbot to suggest products more frequently.</p>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
