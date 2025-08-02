import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Card,
  Page,
  Layout,
  Text,
  Button,
  Banner,
  Box,
  Divider,
  InlineStack,
  BlockStack,
  Badge,
  List,
  Frame,
  Toast,
  DataTable,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { 
  TEST_PLANS,
  TEST_CREDIT_CARDS,
  createTestSubscription,
  checkTestSubscription,
  cancelTestSubscription,
  getTestAnalytics
} from "../utils/test-billing";

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session || !session.shop) {
      throw new Error("No valid session found");
    }
    
    // Check for active test subscription
    const subscriptionData = await checkTestSubscription(session.shop);
    
    // Get analytics data if subscription exists
    let analytics = null;
    if (subscriptionData.subscription) {
      analytics = await getTestAnalytics(session.shop);
    }
    
    return json({
      subscription: subscriptionData.subscription,
      analytics,
      plans: TEST_PLANS,
      hasActiveSubscription: subscriptionData.hasActiveSubscription,
      isProduction: false, // Always test mode for now
      shopDomain: session.shop
    });
  } catch (error) {
    console.error('Billing loader error:', error);
    return json({ 
      subscription: null,
      analytics: null,
      plans: TEST_PLANS,
      hasActiveSubscription: false,
      error: error.message,
      isProduction: false,
      shopDomain: null
    });
  }
}

export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session || !session.shop) {
      return json({ error: "No valid session found" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    
    if (actionType === "subscribe") {
      const planKey = formData.get("planKey");
      
      if (!planKey || !TEST_PLANS[planKey]) {
        return json({ error: "Invalid plan selected" }, { status: 400 });
      }
      
      const result = await createTestSubscription(session.shop, planKey);
      
      if (result.success) {
        return json({ 
          success: true, 
          message: result.message
        });
      } else {
        return json({ error: result.error }, { status: 400 });
      }
    }
    
    if (actionType === "cancel") {
      const result = await cancelTestSubscription(session.shop);
      
      if (result.success) {
        return json({ 
          success: true, 
          message: result.message
        });
      } else {
        return json({ error: result.error }, { status: 400 });
      }
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Billing action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

export default function Billing() {
  const { 
    subscription, 
    analytics, 
    plans, 
    hasActiveSubscription, 
    error, 
    isProduction,
    shopDomain 
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [showToast, setShowToast] = useState(false);

  const isLoading = navigation.state === "submitting";

  const handleSubscribe = useCallback((planKey) => {
    const formData = new FormData();
    formData.append("actionType", "subscribe");
    formData.append("planKey", planKey);
    submit(formData, { method: "post" });
  }, [submit]);

  const handleCancel = useCallback(() => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      const formData = new FormData();
      formData.append("actionType", "cancel");
      submit(formData, { method: "post" });
    }
  }, [submit]);

  // Show success toast
  if (actionData?.success && !showToast) {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  const toastMarkup = showToast && actionData?.success ? (
    <Toast content={actionData.message} onDismiss={() => setShowToast(false)} />
  ) : null;

  const renderPlanCard = (planKey, plan) => {
    const isCurrentPlan = subscription?.planId === planKey;
    const isRecommended = planKey === 'PROFESSIONAL';

    return (
      <Card key={planKey}>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">
              {plan.name}
            </Text>
            {isRecommended && <Badge tone="success">Recommended</Badge>}
            {isCurrentPlan && <Badge tone="info">Current Plan</Badge>}
          </InlineStack>
          
          <Text variant="heading2xl" as="h2">
            ${plan.price}/month
          </Text>
          
          <Text variant="bodyMd" tone="subdued">
            {plan.features[0]} • {plan.trialDays} day free trial
          </Text>
          
          <List type="bullet">
            {plan.features.map((feature, index) => (
              <List.Item key={index}>{feature}</List.Item>
            ))}
          </List>
          
          <Divider />
          
          <Box>
            {isCurrentPlan ? (
              <Button 
                variant="primary" 
                tone="critical"
                onClick={handleCancel}
                loading={isLoading}
                disabled={isLoading}
              >
                Cancel Subscription
              </Button>
            ) : (
              <Button 
                variant="primary"
                onClick={() => handleSubscribe(planKey)}
                loading={isLoading}
                disabled={isLoading || hasActiveSubscription}
              >
                {hasActiveSubscription ? "Upgrade to This Plan" : "Subscribe Now"}
              </Button>
            )}
          </Box>
        </BlockStack>
      </Card>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    const rows = [
      ['Total Usage', analytics.totalUsage?.toString() || '0'],
      ['Current Period Usage', analytics.currentPeriodUsage?.toString() || '0'],
      ['Usage Limit', analytics.usageLimit?.toString() || 'Unlimited'],
      ['Billing Cycle Start', analytics.billingCycleStart ? new Date(analytics.billingCycleStart).toLocaleDateString() : 'N/A'],
      ['Next Billing Date', analytics.nextBillingDate ? new Date(analytics.nextBillingDate).toLocaleDateString() : 'N/A'],
    ];

    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Usage Analytics
          </Text>
          <DataTable
            columnContentTypes={['text', 'text']}
            headings={['Metric', 'Value']}
            rows={rows}
          />
        </BlockStack>
      </Card>
    );
  };

  return (
    <Frame>
      <Page
        title="Billing & Plans"
        subtitle="🧪 Test Mode - Safe testing with simulated payments"
        compactTitle
      >
        {toastMarkup}
        
        <Layout>
          {/* Test Mode Banner */}
          <Layout.Section>
            <Banner tone="info">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">
                  🧪 Test Mode Active - Safe Testing Environment
                </Text>
                <Text variant="bodyMd">
                  All billing is simulated. No real charges will be made. Use these test credit cards:
                </Text>
                <List type="bullet">
                  <List.Item><strong>Visa:</strong> {TEST_CREDIT_CARDS.VISA}</List.Item>
                  <List.Item><strong>Mastercard:</strong> {TEST_CREDIT_CARDS.MASTERCARD}</List.Item>
                  <List.Item><strong>Expiry:</strong> {TEST_CREDIT_CARDS.EXPIRY} | <strong>CVV:</strong> {TEST_CREDIT_CARDS.CVV}</List.Item>
                </List>
              </BlockStack>
            </Banner>
          </Layout.Section>

          {/* Error Banner */}
          {(error || actionData?.error) && (
            <Layout.Section>
              <Banner tone="critical">
                <p>{error || actionData?.error}</p>
              </Banner>
            </Layout.Section>
          )}

          {/* Current Subscription Status */}
          {hasActiveSubscription && subscription && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Current Subscription
                    </Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  
                  <InlineStack gap="400">
                    <Text variant="bodyMd">
                      <strong>Plan:</strong> {subscription.planName || 'N/A'}
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Status:</strong> {subscription.status || 'N/A'}
                    </Text>
                    {subscription.trialDays && (
                      <Text variant="bodyMd">
                        <strong>Trial Days:</strong> {subscription.trialDays}
                      </Text>
                    )}
                  </InlineStack>
                  
                  {subscription.nextBillingDate && (
                    <Text variant="bodyMd" tone="subdued">
                      Next billing date: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {/* Usage Analytics */}
          {analytics && (
            <Layout.Section>
              {renderAnalytics()}
            </Layout.Section>
          )}

          {/* Available Plans */}
          <Layout.Section>
            <BlockStack gap="500">
              <Text variant="headingLg" as="h2">
                {hasActiveSubscription ? "Available Plans" : "Choose Your Plan"}
              </Text>
              
              {!isProduction && (
                <Banner tone="info">
                  <p>
                    This is the production billing system. In production, payments will be processed through Shopify's billing API.
                    Shopify handles all payment processing and takes a 20% commission on subscription fees.
                  </p>
                </Banner>
              )}
              
              <Layout>
                {Object.entries(plans).map(([planKey, plan]) => (
                  <Layout.Section key={planKey} variant="oneThird">
                    {renderPlanCard(planKey, plan)}
                  </Layout.Section>
                ))}
              </Layout>
            </BlockStack>
          </Layout.Section>

          {/* No Subscription Message */}
          {!hasActiveSubscription && !isLoading && (
            <Layout.Section>
              <EmptyState
                heading="No active subscription"
                action={{
                  content: "Choose a plan above",
                  onAction: () => window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Select a subscription plan to start using advanced features of the chatbot widget.
                  All plans include a free trial period.
                </p>
              </EmptyState>
            </Layout.Section>
          )}

          {/* Production Information */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  How Production Billing Works
                </Text>
                <List type="bullet">
                  <List.Item>
                    <strong>Shopify Native:</strong> All payments are processed through Shopify's secure billing system
                  </List.Item>
                  <List.Item>
                    <strong>Revenue Share:</strong> Shopify takes a 20% commission on all subscription fees
                  </List.Item>
                  <List.Item>
                    <strong>Automatic Billing:</strong> Subscriptions are automatically renewed and charged
                  </List.Item>
                  <List.Item>
                    <strong>Trial Period:</strong> All plans include a trial period for new subscribers
                  </List.Item>
                  <List.Item>
                    <strong>Usage Tracking:</strong> Monitor your app usage and subscription metrics
                  </List.Item>
                  <List.Item>
                    <strong>Webhook Integration:</strong> Real-time updates for subscription changes
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Developer Information */}
          {!isProduction && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Development Mode
                  </Text>
                  <Text variant="bodyMd">
                    You're currently in development mode. To test the billing system:
                  </Text>
                  <List type="number">
                    <List.Item>Ensure your development store is set up in Shopify Partners</List.Item>
                    <List.Item>The app must be installed in a development store</List.Item>
                    <List.Item>Billing will be processed through Shopify's billing API</List.Item>
                    <List.Item>Use development store's test payment methods</List.Item>
                  </List>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Page>
    </Frame>
  );
}
