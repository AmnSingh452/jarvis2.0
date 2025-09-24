import { 
    Button, 
    Layout, 
    Page, 
    Card, 
    Text, 
    Badge,
    List,
    Banner
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  // Get the shop domain from the session
  const shopDomain = session.shop;
  const storeHandle = shopDomain.replace('.myshopify.com', '');
  
  return json({
    shopDomain,
    storeHandle,
    appHandle: 'jarvis2-0'
  });
}

export default function Billing() {
    const app = useAppBridge();
    const { shopDomain, storeHandle, appHandle } = useLoaderData();
    
    const handleUpgrade = () => {
        // Redirect to Shopify's Managed Pricing page for plan selection
        const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
        console.log('Redirecting to pricing plans:', managedPricingUrl);
        
        // Open in new tab - works reliably across all environments
        window.open(managedPricingUrl, '_blank');
    };

    const handleManageBilling = () => {
        // Redirect to Shopify's billing management page
        const billingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}`;
        console.log('Redirecting to billing management:', billingUrl);
        
        // Open in new tab - works reliably across all environments
        window.open(billingUrl, '_blank');
    };

    const handleContactSupport = () => {
        // Contact support for billing questions
        const supportUrl = `mailto:billing@jarvis2-ai.com?subject=Billing Support - ${shopDomain}`;
        window.open(supportUrl, '_blank');
    };
    return (
        <Page title="Billing & Plans">
            <Layout>
                <Layout.Section>
                    <Banner 
                        title="Shopify Managed Billing" 
                        status="info"
                        onDismiss={() => {}}
                    >
                        <p>Your billing is managed by Shopify. All charges appear on your monthly Shopify bill. Click "Manage Plans" to view or change your subscription through Shopify's billing system.</p>
                    </Banner>
                </Layout.Section>
                
                <Layout.Section oneHalf>
                    <Card title="Essential Chat" sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Text variant="headingMd" as="h3">$14.99/month</Text>
                            <Badge status="info">Starter Plan</Badge>
                            <Text variant="bodyMd" color="subdued">
                                Perfect for small to medium stores
                            </Text>
                            <List type="bullet">
                                <List.Item>AI customer support chatbot</List.Item>
                                <List.Item>Smart product recommendations</List.Item>
                                <List.Item>Basic analytics dashboard</List.Item>
                                <List.Item>Up to 1,000 conversations/month</List.Item>
                                <List.Item>Standard support</List.Item>
                            </List>
                            <Button onClick={handleUpgrade} primary>
                                Select Essential Chat
                            </Button>
                        </div>
                    </Card>
                </Layout.Section>
                
                <Layout.Section oneHalf>
                    <Card title="Sales Pro" sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Text variant="headingMd" as="h3">$39.99/month</Text>
                            <Badge status="success">Recommended</Badge>
                            <Text variant="bodyMd" color="subdued">
                                Advanced features for growing businesses
                            </Text>
                            <List type="bullet">
                                <List.Item>Everything in Essential Chat</List.Item>
                                <List.Item>Abandoned cart recovery automation</List.Item>
                                <List.Item>Advanced analytics & insights</List.Item>
                                <List.Item>Unlimited conversations</List.Item>
                                <List.Item>Priority support (12hr response)</List.Item>
                                <List.Item>Custom integration support</List.Item>
                            </List>
                            <Button onClick={handleUpgrade} primary>
                                Select Sales Pro
                            </Button>
                        </div>
                    </Card>
                </Layout.Section>
                
                <Layout.Section>
                    <Card sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Text variant="headingMd" as="h3">Billing Management</Text>
                            <Text variant="bodyMd">
                                Your subscription is managed through Shopify's billing system. All charges appear on your monthly Shopify invoice.
                            </Text>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <Button onClick={handleManageBilling}>
                                    Manage Plans
                                </Button>
                                <Button onClick={handleContactSupport} outline>
                                    Contact Billing Support
                                </Button>
                            </div>
                            <Text variant="bodyMd" color="subdued">
                                <strong>Store:</strong> {shopDomain} | <strong>App Handle:</strong> {appHandle}
                            </Text>
                        </div>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}