import { 
    Button, 
    Layout, 
    Page, 
    Card, 
    Text, 
    Badge,
    List,
    Banner,
    ButtonGroup,
    Divider,
    Box
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useState } from "react";

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
    const [billingCycle, setBillingCycle] = useState('monthly');
    
    const handleUpgrade = () => {
        // Redirect to Shopify's Managed Pricing page for plan selection
        const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
        console.log('Redirecting to pricing plans:', managedPricingUrl);
        
        // Open in new tab - works reliably across all environments
        window.open(managedPricingUrl, '_blank');
    };

    const handleContactSupport = () => {
        // Contact support for billing questions
        const supportUrl = `mailto:billing@jarvis2-ai.com?subject=Billing Support - ${shopDomain}`;
        window.open(supportUrl, '_blank');
    };

    const pricingData = {
        monthly: {
            essential: { price: 14.99, yearlyPrice: 179.88 },
            salesPro: { price: 39.99, yearlyPrice: 479.88 }
        },
        yearly: {
            essential: { price: 169.99, monthlyEquivalent: 14.17, savings: 9.89 },
            salesPro: { price: 459.99, monthlyEquivalent: 38.33, savings: 19.89 }
        }
    };
    return (
        <Page title="Billing & Plans">
            <Layout>
                <Layout.Section>
                    <Banner 
                        title="14-Day Free Trial + Shopify Managed Billing" 
                        status="success"
                        onDismiss={() => {}}
                    >
                        <p><strong>Start with a 14-day free trial!</strong> Your billing is managed by Shopify - all charges appear on your monthly Shopify bill. Cancel anytime during the trial period with no charges.</p>
                    </Banner>
                </Layout.Section>

                <Layout.Section>
                    <Card sectioned>
                        <Box paddingBlockEnd="4">
                            <Text variant="headingMd" as="h3">Choose Your Billing Cycle</Text>
                            <Text variant="bodyMd" color="subdued" tone="subdued">
                                Save money with yearly billing
                            </Text>
                        </Box>
                        <ButtonGroup segmented>
                            <Button 
                                pressed={billingCycle === 'monthly'}
                                onClick={() => setBillingCycle('monthly')}
                            >
                                Monthly
                            </Button>
                            <Button 
                                pressed={billingCycle === 'yearly'}
                                onClick={() => setBillingCycle('yearly')}
                            >
                                Yearly (Save up to $19/year)
                            </Button>
                        </ButtonGroup>
                    </Card>
                </Layout.Section>
                
                <Layout.Section oneHalf>
                    <Card title="Essential Chat" sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {billingCycle === 'monthly' ? (
                                <>
                                    <Text variant="headingMd" as="h3">$14.99/month</Text>
                                    <Text variant="bodyMd" color="subdued">
                                        Or $179.88/year
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text variant="headingMd" as="h3">$169.99/year</Text>
                                    <Badge status="attention">Save $9.89/year</Badge>
                                    <Text variant="bodyMd" color="subdued">
                                        $14.17/month equivalent
                                    </Text>
                                </>
                            )}
                            <Badge status="info">Starter Plan</Badge>
                            <Text variant="bodyMd" color="subdued">
                                Perfect for small to medium stores
                            </Text>
                            <List type="bullet">
                                <List.Item><strong>14-day free trial</strong></List.Item>
                                <List.Item>AI customer support chatbot</List.Item>
                                <List.Item>Smart product recommendations</List.Item>
                                <List.Item>Basic analytics dashboard</List.Item>
                                <List.Item>Up to 1,000 conversations/month</List.Item>
                                <List.Item>Standard support</List.Item>
                            </List>
                            <Button onClick={handleUpgrade} primary>
                                Start Free Trial - Essential
                            </Button>
                        </div>
                    </Card>
                </Layout.Section>
                
                <Layout.Section oneHalf>
                    <Card title="Sales Pro" sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {billingCycle === 'monthly' ? (
                                <>
                                    <Text variant="headingMd" as="h3">$39.99/month</Text>
                                    <Text variant="bodyMd" color="subdued">
                                        Or $479.88/year
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text variant="headingMd" as="h3">$459.99/year</Text>
                                    <Badge status="success">Save $19.89/year</Badge>
                                    <Text variant="bodyMd" color="subdued">
                                        $38.33/month equivalent
                                    </Text>
                                </>
                            )}
                            <Badge status="success">Recommended</Badge>
                            <Text variant="bodyMd" color="subdued">
                                Advanced features for growing businesses
                            </Text>
                            <List type="bullet">
                                <List.Item><strong>14-day free trial</strong></List.Item>
                                <List.Item>Everything in Essential Chat</List.Item>
                                <List.Item>Abandoned cart recovery automation</List.Item>
                                <List.Item>Advanced analytics & insights</List.Item>
                                <List.Item>Unlimited conversations</List.Item>
                                <List.Item>Priority support (12hr response)</List.Item>
                                <List.Item>Custom integration support</List.Item>
                            </List>
                            <Button onClick={handleUpgrade} primary>
                                Start Free Trial - Sales Pro
                            </Button>
                        </div>
                    </Card>
                </Layout.Section>
                
                <Layout.Section>
                    <Card sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Text variant="headingMd" as="h3">Billing Management</Text>
                            <Text variant="bodyMd">
                                Your subscription is managed through Shopify's billing system. All charges appear on your monthly Shopify invoice. For plan changes or billing questions, please contact our support team.
                            </Text>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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