import { useState } from "react";
import { 
    Button, 
    Layout, 
    Page, 
    Card, 
    Text,
    TextField,
    Banner
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function BillingTest() {
    const app = useAppBridge();
    const [storeHandle, setStoreHandle] = useState("");
    
    const testManagedPricing = () => {
        if (!storeHandle) {
            alert("Please enter your store handle");
            return;
        }
        
        const appHandle = "jarvis2-0";
        const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
        
        console.log("Redirecting to:", managedPricingUrl);
        
        // Use window.open instead of App Bridge for testing
        window.open(managedPricingUrl, '_blank');
    };
    
    const testBillingManagement = () => {
        if (!storeHandle) {
            alert("Please enter your store handle");
            return;
        }
        
        const appHandle = "jarvis2-0";
        const billingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}`;
        
        console.log("Redirecting to:", billingUrl);
        
        // Use window.open instead of App Bridge for testing
        window.open(billingUrl, '_blank');
    };
    
    return (
        <Page title="Billing Integration Test">
            <Layout>
                <Layout.Section>
                    <Banner title="Testing Shopify Managed Pricing" status="info">
                        <p>Use this page to test the billing integration before going live. Enter your store handle to test the redirect URLs.</p>
                    </Banner>
                </Layout.Section>
                
                <Layout.Section>
                    <Card sectioned>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Text variant="headingMd" as="h3">Test Managed Pricing Integration</Text>
                            
                            <TextField
                                label="Store Handle"
                                value={storeHandle}
                                onChange={setStoreHandle}
                                placeholder="your-store-name (without .myshopify.com)"
                                helpText="Enter your store handle (e.g., 'my-test-store' for my-test-store.myshopify.com)"
                            />
                            
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button primary onClick={testManagedPricing}>
                                    Test Pricing Plans Page
                                </Button>
                                <Button onClick={testBillingManagement}>
                                    Test Billing Management
                                </Button>
                            </div>
                            
                            <Text variant="bodyMd" color="subdued">
                                Expected URLs:
                            </Text>
                            <Text variant="bodyMd" color="subdued">
                                • Pricing Plans: https://admin.shopify.com/store/{storeHandle || '{store-handle}'}/charges/jarvis2-0/pricing_plans
                            </Text>
                            <Text variant="bodyMd" color="subdued">
                                • Billing Management: https://admin.shopify.com/store/{storeHandle || '{store-handle}'}/charges/jarvis2-0
                            </Text>
                        </div>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
