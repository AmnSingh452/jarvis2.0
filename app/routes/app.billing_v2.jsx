import { json } from "@remix-run/node";
import { useLoaderData, Form, useSubmit, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Badge, Banner, Button, Card, Layout, Page, Text } from "@shopify/polaris";
import { requestPlan, getPlanStatus, BILLING_PLANS } from "../utils/billing";
import { useEffect } from "react";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Get current billing status
    const billingStatus = await getPlanStatus(admin);
    
    return json({
      shop: session.shop,
      billingStatus,
    });
  } catch (error) {
    console.error("Loader error:", error);
    return json({
      shop: session.shop,
      billingStatus: null,
      error: error.message,
    });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedPlan = formData.get("plan");
  
  try {
    // Request the selected plan
    const billingResponse = await requestPlan(admin, selectedPlan);
    
    if (billingResponse?.confirmationUrl) {
      // Return the confirmation URL for client-side redirect
      return json({ 
        success: true, 
        confirmationUrl: billingResponse.confirmationUrl 
      });
    } else {
      throw new Error("No confirmation URL received from Shopify");
    }
  } catch (error) {
    console.error("Action error:", error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 400 });
  }
};

export default function BillingPage() {
  const { shop, billingStatus, error } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  // Handle redirect to Shopify billing confirmation
  useEffect(() => {
    if (actionData?.success && actionData.confirmationUrl) {
      console.log("Redirecting to Shopify billing:", actionData.confirmationUrl);
      window.top.location.href = actionData.confirmationUrl;
    }
  }, [actionData]);

  const handlePlanSelection = (planName) => {
    console.log("Requesting plan:", planName);
    const formData = new FormData();
    formData.append("plan", planName);
    submit(formData, { method: "POST" });
  };

  const currentPlan = billingStatus?.plan;
  const isSubscribed = billingStatus?.hasActivePayment;

  return (
    <Page title="Billing & Plans">
      <Layout>
        <Layout.Section>
          {error && (
            <Banner status="critical">
              <p>Error loading billing information: {error}</p>
            </Banner>
          )}
          
          {actionData?.error && (
            <Banner status="critical">
              <p>Billing error: {actionData.error}</p>
            </Banner>
          )}
          
          <Banner status="info">
            <p>Your app uses Shopify's secure billing system. All transactions are processed by Shopify and added to your monthly invoice.</p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current Plan Status */}
            {isSubscribed && currentPlan && (
              <Card sectioned>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Text variant="headingMd">Current Plan</Text>
                  <Badge status="success">{currentPlan}</Badge>
                  <Text variant="bodyMd" color="subdued">
                    Your plan is active and billing is managed by Shopify.
                  </Text>
                </div>
              </Card>
            )}

            {/* Essential Chat Plan */}
            <Card sectioned>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Text variant="headingLg">Essential Chat</Text>
                  <Badge>$14.99/month</Badge>
                </div>
                <Text variant="bodyMd">
                  Perfect for small to medium businesses looking to enhance customer support with AI.
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Text variant="bodyMd">✓ AI customer support chatbot</Text>
                  <Text variant="bodyMd">✓ Smart product recommendations</Text>
                  <Text variant="bodyMd">✓ Basic analytics dashboard</Text>
                  <Text variant="bodyMd">✓ Up to 1,000 conversations/month</Text>
                  <Text variant="bodyMd">✓ Standard support</Text>
                </div>
                {currentPlan !== BILLING_PLANS.ESSENTIAL && (
                  <Button 
                    primary 
                    onClick={() => handlePlanSelection(BILLING_PLANS.ESSENTIAL)}
                    loading={actionData?.loading}
                  >
                    Select Essential Chat
                  </Button>
                )}
                {currentPlan === BILLING_PLANS.ESSENTIAL && (
                  <Badge status="success">Current Plan</Badge>
                )}
              </div>
            </Card>

            {/* Sales Pro Plan */}
            <Card sectioned>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Text variant="headingLg">Sales Pro</Text>
                  <Badge>$39.99/month</Badge>
                </div>
                <Text variant="bodyMd">
                  Advanced features for growing businesses that want to maximize conversions and customer lifetime value.
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Text variant="bodyMd">✓ Everything in Essential Chat</Text>
                  <Text variant="bodyMd">✓ Abandoned cart recovery automation</Text>
                  <Text variant="bodyMd">✓ Advanced analytics & insights</Text>
                  <Text variant="bodyMd">✓ Unlimited conversations</Text>
                  <Text variant="bodyMd">✓ Priority support (12hr response)</Text>
                  <Text variant="bodyMd">✓ Custom integration support</Text>
                </div>
                {currentPlan !== BILLING_PLANS.PRO && (
                  <Button 
                    primary 
                    onClick={() => handlePlanSelection(BILLING_PLANS.PRO)}
                    loading={actionData?.loading}
                  >
                    Select Sales Pro
                  </Button>
                )}
                {currentPlan === BILLING_PLANS.PRO && (
                  <Badge status="success">Current Plan</Badge>
                )}
              </div>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Text variant="headingMd">Need Help?</Text>
              <Text variant="bodyMd">
                If you have questions about billing, need to change your plan, or require technical support, 
                our team is here to help.
              </Text>
              <Button 
                external 
                url="mailto:support@jarvisai.app?subject=Billing Support"
              >
                Contact Billing Support
              </Button>
            </div>
          </Card>
        </Layout.Section>

        {/* Debug Information */}
        <Layout.Section>
          <Card sectioned>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Text variant="headingMd">Debug Information</Text>
              <Text variant="bodyMd">Store: {shop}</Text>
              <Text variant="bodyMd">Current Plan: {currentPlan || "None"}</Text>
              <Text variant="bodyMd">Has Active Payment: {isSubscribed ? "Yes" : "No"}</Text>
              <Text variant="bodyMd" color="subdued">
                Using Shopify's official billing API with proper charge creation flow.
              </Text>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}