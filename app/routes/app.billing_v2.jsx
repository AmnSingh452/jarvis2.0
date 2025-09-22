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
import { Redirect } from "@shopify/app-bridge/actions";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";

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
    const [isLoading, setIsLoading] = useState(false);
    
    // Debug logging
    useEffect(() => {
        console.log('Billing component loaded:', {
            shopDomain,
            storeHandle, 
            appHandle,
            appBridge: !!app
        });
    }, [shopDomain, storeHandle, appHandle, app]);
    
    const handleUpgrade = () => {
        console.log('handleUpgrade called');
        setIsLoading(true);
        
        // Use Shopify App Bridge to navigate to pricing plans
        try {
            if (!app) {
                throw new Error('App Bridge not available');
            }
            
            const redirect = Redirect.create(app);
            const pricingPath = `/charges/${appHandle}/pricing_plans`;
            console.log('Redirecting to pricing plans via App Bridge:', pricingPath);
            
            redirect.dispatch(Redirect.Action.ADMIN_PATH, {
                path: pricingPath
            });
        } catch (error) {
            console.error('App Bridge redirect failed, using fallback:', error);
            // Fallback: Use direct URL
            const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
            console.log('Using fallback URL:', managedPricingUrl);
            window.open(managedPricingUrl, '_top');
        } finally {
            setIsLoading(false);
        }
    };

    const handleManageBilling = () => {
        console.log('handleManageBilling called');
        setIsLoading(true);
        
        // Use Shopify App Bridge to navigate to billing management
        try {
            if (!app) {
                throw new Error('App Bridge not available');
            }
            
            const redirect = Redirect.create(app);
            const billingPath = `/charges/${appHandle}`;
            console.log('Redirecting to billing management via App Bridge:', billingPath);
            
            redirect.dispatch(Redirect.Action.ADMIN_PATH, {
                path: billingPath
            });
        } catch (error) {
            console.error('App Bridge redirect failed, using fallback:', error);
            // Fallback: Use direct URL in same window
            const billingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}`;
            console.log('Using fallback URL:', billingUrl);
            window.open(billingUrl, '_top');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewCurrentPlan = () => {
        console.log('handleViewCurrentPlan called');
        setIsLoading(true);
        
        // Navigate to app subscriptions page
        try {
            if (!app) {
                throw new Error('App Bridge not available');
            }
            
            const redirect = Redirect.create(app);
            const appPath = `/apps/${appHandle}`;
            console.log('Redirecting to current plan via App Bridge:', appPath);
            
            redirect.dispatch(Redirect.Action.ADMIN_PATH, {
                path: appPath
            });
        } catch (error) {
            console.error('App Bridge redirect failed, using fallback:', error);
            // Fallback: Use direct URL
            const appUrl = `https://admin.shopify.com/store/${storeHandle}/apps/${appHandle}`;
            console.log('Using fallback URL:', appUrl);
            window.open(appUrl, '_top');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContactSupport = () => {
        console.log('handleContactSupport called');
        // Contact support for billing questions
        const supportUrl = `mailto:support@jarvis2-ai.com?subject=Billing Support - ${shopDomain}&body=Hello,%0D%0A%0D%0AI need assistance with billing for my store: ${shopDomain}%0D%0A%0D%0APlease describe your issue below:%0D%0A`;
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
                            <Button onClick={handleUpgrade} primary loading={isLoading}>
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
                            <Button onClick={handleUpgrade} primary loading={isLoading}>
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
                                <Button onClick={handleManageBilling} primary loading={isLoading}>
                                    Manage Plans
                                </Button>
                                <Button onClick={handleViewCurrentPlan} outline loading={isLoading}>
                                    View Current Plan
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