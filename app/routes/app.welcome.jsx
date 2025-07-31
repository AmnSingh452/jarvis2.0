import { useLoaderData } from "@remix-run/react";
import { Card, Page, Layout, Text, Button, List, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  return {
    shopName: session.shop.replace('.myshopify.com', ''),
    shopDomain: session.shop,
    features: [
      {
        title: "24/7 Customer Support",
        description: "Instant responses to customer queries anytime"
      },
      {
        title: "Increased Sales", 
        description: "Convert more visitors with intelligent product recommendations"
      },
      {
        title: "Easy Setup",
        description: "Get started in just a few clicks - no coding required"
      },
      {
        title: "Smart AI",
        description: "Powered by advanced AI to understand customer needs"
      }
    ]
  };
}

export default function Welcome() {
  const { shopName, features } = useLoaderData();

  return (
    <Page
      title="Welcome to Jarvis AI Chatbot! 🎉"
      subtitle={`Great choice, ${shopName}! Your customers will love the instant support.`}
    >
      <Layout>
        <Layout.Section>
          <Banner
            title="Installation Successful!"
            status="success"
          >
            <p>Your AI chatbot is now active and ready to help your customers 24/7.</p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingLg" as="h2">
                What you get with Jarvis AI:
              </Text>
              <div style={{ marginTop: '20px' }}>
                {features.map((feature, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    marginBottom: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ marginRight: '12px', color: '#00848e', marginTop: '2px' }}>
                      ✅
                    </div>
                    <div>
                      <Text variant="headingMd" as="h3">
                        {feature.title}
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        {feature.description}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingMd" as="h3">
                    🚀 Next Steps
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <List type="number">
                      <List.Item>Customize your chatbot settings</List.Item>
                      <List.Item>Add your product knowledge base</List.Item>
                      <List.Item>Test the chatbot on your store</List.Item>
                    </List>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <Button primary url="/app?welcomed=true">
                      Get Started
                    </Button>
                  </div>
                </div>
              </Card>
            </Layout.Section>

            <Layout.Section oneHalf>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingMd" as="h3">
                    📊 Monitor Performance
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Track how your chatbot is helping customers and boosting sales.
                  </Text>
                  <div style={{ marginTop: '20px' }}>
                    <Button>
                      View Analytics
                    </Button>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Text variant="headingMd" as="h3">
                Need Help? We're Here for You! 💬
              </Text>
              <Text variant="bodyMd" color="subdued">
                Our support team is ready to help you get the most out of Jarvis AI.
              </Text>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button>Contact Support</Button>
                <Button outline>View Documentation</Button>
                <Button outline url="/app?welcomed=true">Skip to App</Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
