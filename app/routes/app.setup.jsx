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
    Box,
    Stack,
    Icon,
    InlineCode
} from "@shopify/polaris";
import { 
    CheckmarkIcon,
    ThemeIcon,
    SettingsIcon,
    ViewIcon
} from "@shopify/polaris-icons";
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
    appHandle: 'jarvis2-0',
    appClientId: '3ea38032bd55fb833a9f5dfd0ca9d4d0',
    extensionId: 'd1cd677e-2dc7-8520-c5f1-3bbf1bf18b9fc699e04f'
  });
}

export default function Setup() {
    const app = useAppBridge();
    const { shopDomain, storeHandle, appHandle, appClientId, extensionId } = useLoaderData();
    const [currentStep, setCurrentStep] = useState(1);
    
    // Deep link URLs for theme app extensions
    const deepLinks = {
        // App embed block activation (recommended - works on all themes)
        activateWidget: `https://${shopDomain}/admin/themes/current/editor?context=apps&activateAppId=${appClientId}/chatbot-embed`,
        
        // Add to specific templates
        homePage: `https://${shopDomain}/admin/themes/current/editor?template=index&activateAppId=${appClientId}/chatbot-embed`,
        productPage: `https://${shopDomain}/admin/themes/current/editor?template=product&activateAppId=${appClientId}/chatbot-embed`,
        collectionPage: `https://${shopDomain}/admin/themes/current/editor?template=collection&activateAppId=${appClientId}/chatbot-embed`,
        
        // Theme editor main page
        themeEditor: `https://${shopDomain}/admin/themes/current/editor`
    };

    const handleActivateWidget = () => {
        // Use the deep link to activate the app embed block
        console.log('🚀 Opening theme editor with app embed activated');
        window.open(deepLinks.activateWidget, '_blank');
    };

    const handleOpenThemeEditor = () => {
        window.open(deepLinks.themeEditor, '_blank');
    };

    const steps = [
        {
            id: 1,
            title: "Activate Jarvis Widget",
            description: "Enable the chatbot widget in your theme",
            action: "activate"
        },
        {
            id: 2,
            title: "Customize Settings", 
            description: "Configure your widget appearance and behavior",
            action: "customize"
        },
        {
            id: 3,
            title: "Test Your Chatbot",
            description: "Preview and verify the widget is working",
            action: "test"
        }
    ];

    return (
        <Page 
            title="Setup Instructions" 
            subtitle="Get your Jarvis AI chatbot running on your store in 3 simple steps"
        >
            <Layout>
                {/* Main Setup Banner */}
                <Layout.Section>
                    <Banner 
                        title="Quick Setup - 2 Minutes to Launch" 
                        status="success"
                    >
                        <p>Follow these steps to add the Jarvis AI chatbot to your store. The widget works with all Shopify themes and appears as a floating chat button for your customers.</p>
                    </Banner>
                </Layout.Section>

                {/* Progress Steps */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Text variant="headingMd" as="h2">Setup Progress</Text>
                            <Box paddingBlockStart="2">
                                <Stack spacing="extraLoose">
                                    {steps.map((step) => (
                                        <Stack key={step.id} alignment="center" spacing="tight">
                                            <Box 
                                                background={step.id <= currentStep ? "success" : "subdued"} 
                                                padding="1"
                                                borderRadius="full"
                                                minWidth="32px"
                                                textAlign="center"
                                            >
                                                <Text 
                                                    variant="bodySm" 
                                                    color={step.id <= currentStep ? "success" : "subdued"}
                                                    fontWeight="bold"
                                                >
                                                    {step.id <= currentStep ? "✓" : step.id}
                                                </Text>
                                            </Box>
                                            <Stack vertical spacing="none">
                                                <Text variant="bodyMd" fontWeight="semibold">{step.title}</Text>
                                                <Text variant="bodyMd" color="subdued">{step.description}</Text>
                                            </Stack>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </Card>
                </Layout.Section>

                {/* Step 1: Activate Widget */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Stack alignment="center" spacing="tight">
                                <Box 
                                    background="success" 
                                    padding="1" 
                                    borderRadius="full"
                                    minWidth="32px"
                                    textAlign="center"
                                >
                                    <Text variant="bodySm" color="success" fontWeight="bold">1</Text>
                                </Box>
                                <Text variant="headingMd" as="h3">Activate Jarvis Widget</Text>
                            </Stack>
                            
                            <Text variant="bodyMd">
                                Click the button below to automatically open your theme editor and activate the Jarvis chatbot widget. This will add a floating chat button to your store.
                            </Text>

                            <Banner status="info">
                                <p><strong>One-Click Setup:</strong> Our deep link will take you directly to the right place in your theme editor. No manual searching required!</p>
                            </Banner>

                            <Box paddingBlockStart="4">
                                <Button 
                                    primary 
                                    size="large"
                                    onClick={handleActivateWidget}
                                >
                                    🚀 Activate Chatbot Widget
                                </Button>
                            </Box>

                            <Divider />

                            <Box paddingBlockStart="4">
                                <Text variant="bodyMd" fontWeight="semibold">What happens next:</Text>
                                <List type="bullet">
                                    <List.Item>Opens your theme editor in a new tab</List.Item>
                                    <List.Item>Automatically navigates to <strong>Theme Settings → App embeds</strong></List.Item>
                                    <List.Item>Shows the Jarvis Widget ready to activate</List.Item>
                                    <List.Item>Click the toggle to enable it on your store</List.Item>
                                </List>
                            </Box>

                            <Box paddingBlockStart="4">
                                <Text variant="bodyMd" color="subdued">
                                    <strong>Alternative method:</strong> If the button above doesn't work, you can manually go to your 
                                    theme editor → Theme Settings → App embeds → Enable "Jarvis Widget"
                                </Text>
                            </Box>
                        </Stack>
                    </Card>
                </Layout.Section>

                {/* Step 2: Customize Settings */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Stack alignment="center" spacing="tight">
                                <Box 
                                    background="subdued" 
                                    padding="1" 
                                    borderRadius="full"
                                    minWidth="32px"
                                    textAlign="center"
                                >
                                    <Text variant="bodySm" color="subdued" fontWeight="bold">2</Text>
                                </Box>
                                <Text variant="headingMd" as="h3">Customize Widget Settings</Text>
                            </Stack>

                            <Text variant="bodyMd">
                                After activating the widget, customize its appearance and behavior from the Jarvis admin panel.
                            </Text>

                            <Box paddingBlockStart="2">
                                <Text variant="bodyMd" fontWeight="semibold">Customization Options:</Text>
                                <List type="bullet">
                                    <List.Item><strong>Widget Colors:</strong> Match your brand colors</List.Item>
                                    <List.Item><strong>Position:</strong> Choose corner placement (bottom-right recommended)</List.Item>
                                    <List.Item><strong>Size:</strong> Adjust button size for your theme</List.Item>
                                    <List.Item><strong>Cart Recovery:</strong> Enable abandoned cart offers</List.Item>
                                    <List.Item><strong>Welcome Message:</strong> Customize greeting text</List.Item>
                                </List>
                            </Box>

                            <Box paddingBlockStart="4">
                                <Button onClick={() => window.location.href = '/app/widget-settings'}>
                                    ⚙️ Go to Widget Settings
                                </Button>
                            </Box>
                        </Stack>
                    </Card>
                </Layout.Section>

                {/* Step 3: Test Widget */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Stack alignment="center" spacing="tight">
                                <Box 
                                    background="subdued" 
                                    padding="1" 
                                    borderRadius="full"
                                    minWidth="32px"
                                    textAlign="center"
                                >
                                    <Text variant="bodySm" color="subdued" fontWeight="bold">3</Text>
                                </Box>
                                <Text variant="headingMd" as="h3">Test Your Chatbot</Text>
                            </Stack>

                            <Text variant="bodyMd">
                                Visit your store to test the chatbot and ensure it's working correctly.
                            </Text>

                            <Box paddingBlockStart="2">
                                <Text variant="bodyMd" fontWeight="semibold">Testing Checklist:</Text>
                                <List type="bullet">
                                    <List.Item>✓ Widget appears in the bottom-right corner</List.Item>
                                    <List.Item>✓ Chat window opens when clicked</List.Item>
                                    <List.Item>✓ Bot responds to customer messages</List.Item>
                                    <List.Item>✓ Product recommendations work</List.Item>
                                    <List.Item>✓ Cart recovery offers appear (if enabled)</List.Item>
                                </List>
                            </Box>

                            <Box paddingBlockStart="4">
                                <ButtonGroup>
                                    <Button 
                                        onClick={() => window.open(`https://${storeHandle}.myshopify.com`, '_blank')}
                                    >
                                        🛍️ Visit Your Store
                                    </Button>
                                    <Button 
                                        onClick={() => window.location.href = '/app/analytics'}
                                        outline
                                    >
                                        📊 View Analytics
                                    </Button>
                                </ButtonGroup>
                            </Box>
                        </Stack>
                    </Card>
                </Layout.Section>

                {/* Troubleshooting Section */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Text variant="headingMd" as="h3">Troubleshooting</Text>
                            
                            <Box>
                                <Text variant="bodyMd" fontWeight="semibold">Widget not appearing?</Text>
                                <List type="bullet">
                                    <List.Item>Make sure you activated it in Theme Settings → App embeds</List.Item>
                                    <List.Item>Check that your theme is published (not just saved)</List.Item>
                                    <List.Item>Clear your browser cache and refresh the page</List.Item>
                                    <List.Item>Verify you're not in the theme editor preview mode</List.Item>
                                </List>
                            </Box>

                            <Box paddingBlockStart="4">
                                <Text variant="bodyMd" fontWeight="semibold">Need help?</Text>
                                <Stack spacing="tight">
                                    <Button 
                                        outline 
                                        onClick={() => window.open('mailto:support@jarvis2-ai.com?subject=Setup Help - ' + shopDomain, '_blank')}
                                    >
                                        📧 Contact Support
                                    </Button>
                                    <Button 
                                        outline
                                        onClick={handleOpenThemeEditor}
                                    >
                                        🎨 Open Theme Editor
                                    </Button>
                                </Stack>
                            </Box>
                        </Stack>
                    </Card>
                </Layout.Section>

                {/* Technical Details */}
                <Layout.Section>
                    <Card sectioned>
                        <Stack vertical spacing="loose">
                            <Text variant="headingMd" as="h3">Technical Information</Text>
                            
                            <Box>
                                <Text variant="bodyMd">
                                    <strong>Extension Type:</strong> App Embed Block<br/>
                                    <strong>Compatibility:</strong> All Shopify themes (including vintage themes)<br/>
                                    <strong>Loading:</strong> Asynchronous (doesn't slow down your store)<br/>
                                    <strong>Privacy:</strong> GDPR compliant, no customer data stored without consent
                                </Text>
                            </Box>

                            <Banner status="info">
                                <p><strong>Developer Note:</strong> The Jarvis widget uses Shopify's official App Embed technology, 
                                ensuring compatibility with all themes and optimal performance.</p>
                            </Banner>
                        </Stack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}