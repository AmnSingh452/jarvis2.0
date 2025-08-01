import { useState } from "react";
import { useLoaderData, useSubmit, useActionData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  List,
  Banner,
  BlockStack,
  InlineStack,
  Divider,
  Spinner,
  Box
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import { checkSubscriptionStatus, createTrialSubscription, getSubscriptionAnalytics, createDefaultPlans } from "../utils/billing.js";
import prisma from "../db.server.js";

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    
    // Ensure default plans exist
    await ensureDefaultPlansExist();
    
    // Get current subscription and analytics
    const subscriptionCheck = await checkSubscriptionStatus(session.shop);
    const analytics = await getSubscriptionAnalytics(session.shop);
    
    // Get available plans
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    
    return json({ 
      subscription: analytics.hasData ? analytics.subscription : null,
      analytics: analytics.hasData ? analytics.analytics : null,
      plans, 
      shopDomain: session.shop,
      hasAccess: subscriptionCheck.hasAccess,
      accessReason: subscriptionCheck.reason
    });
  } catch (error) {
    console.error('Billing loader error:', error);
    return json({ 
      error: 'Failed to load billing information',
      subscription: null,
      plans: [],
      shopDomain: null
    });
  }
}

async function ensureDefaultPlansExist() {
  try {
    const planCount = await prisma.plan.count();
    
    if (planCount === 0) {
      console.log('Creating default billing plans...');
      await createDefaultPlans();
    }
  } catch (error) {
    console.error('Error ensuring default plans exist:', error);
  }
}

export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("_action");
    
    if (action === "start_trial") {
      const result = await createTrialSubscription(session.shop);
      
      if (result.success) {
        return json({ 
          success: true, 
          message: "Trial subscription started successfully!" 
        });
      } else {
        return json({ 
          error: result.error || "Failed to start trial subscription" 
        }, { status: 400 });
      }
    }
    
    if (action === "select_plan") {
      const planId = formData.get("planId");
      
      const plan = await prisma.plan.findUnique({
        where: { id: planId }
      });
      
      if (!plan) {
        return json({ error: "Plan not found" }, { status: 404 });
      }
      
      // For now, just create a pending subscription
      // In production, this would integrate with Shopify's billing API
      await prisma.subscription.upsert({
        where: { shopDomain: session.shop },
        update: {
          planId: plan.id,
          status: 'PENDING',
          messagesLimit: plan.messagesLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (plan.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
        },
        create: {
          shopDomain: session.shop,
          planId: plan.id,
          status: 'PENDING',
          billingCycle: plan.billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (plan.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
          messagesLimit: plan.messagesLimit,
          messagesUsed: 0
        }
      });
      
      return json({ 
        success: true, 
        message: `${plan.name} plan selected! (Demo mode - no actual billing)` 
      });
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Billing action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

export default function Billing() {
  const { subscription, analytics, plans, shopDomain, hasAccess, accessReason } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  
  const handleStartTrial = () => {
    const formData = new FormData();
    formData.append("_action", "start_trial");
    submit(formData, { method: "post" });
  };
  
  const handlePlanSelect = (planId) => {
    const formData = new FormData();
    formData.append("_action", "select_plan");
    formData.append("planId", planId);
    submit(formData, { method: "post" });
  };
  
  const formatPrice = (price, cycle) => {
    return `$${price}/${cycle === 'MONTHLY' ? 'month' : 'year'}`;
  };
  
  const getStatusBadge = (status) => {
    const statusMap = {
      'ACTIVE': { status: 'success', text: 'Active' },
      'TRIAL': { status: 'info', text: 'Trial' },
      'PENDING': { status: 'warning', text: 'Pending' },
      'CANCELLED': { status: 'critical', text: 'Cancelled' }
    };
    return statusMap[status] || { status: 'default', text: status };
  };

  return (
    <Page
      title="💳 Billing & Subscription"
      subtitle="Manage your Jarvis AI Chatbot subscription"
    >
      <TitleBar title="Billing & Subscription" />
      
      {actionData?.error && (
        <Banner status="critical" onDismiss={() => {}}>
          <p>{actionData.error}</p>
        </Banner>
      )}
      
      {actionData?.success && (
        <Banner status="success" onDismiss={() => {}}>
          <p>{actionData.message}</p>
        </Banner>
      )}
      
      <Layout>
        {/* Current Subscription Status */}
        <Layout.Section>
          {subscription ? (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Current Subscription
                </Text>
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <Text variant="headingLg" as="h3">
                        {subscription.plan.name}
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        {formatPrice(subscription.plan.price, subscription.billingCycle)}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {subscription.messagesUsed}/{subscription.messagesLimit} messages used
                      </Text>
                    </BlockStack>
                    <Badge {...getStatusBadge(subscription.status)}>
                      {getStatusBadge(subscription.status).text}
                    </Badge>
                  </InlineStack>
                </Box>
                
                {analytics && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold">Usage Analytics</Text>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '16px',
                      borderRadius: '8px'
                    }}>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd">Messages Used</Text>
                        <Text variant="bodyMd">
                          {subscription.messagesUsed}/{subscription.messagesLimit}
                        </Text>
                      </InlineStack>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e1e5e9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '8px'
                      }}>
                        <div style={{
                          width: `${Math.min(analytics.usagePercentage, 100)}%`,
                          height: '100%',
                          backgroundColor: analytics.isNearLimit ? '#dc3545' : '#007bff',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <InlineStack align="space-between" blockAlign="center" gap="200">
                        <Text variant="bodySm" color="subdued">
                          {analytics.remainingDays} days remaining
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {analytics.usagePercentage.toFixed(1)}% used
                        </Text>
                      </InlineStack>
                    </div>
                    
                    {analytics.isNearLimit && (
                      <Banner status="warning">
                        <p>You're approaching your message limit. Consider upgrading your plan.</p>
                      </Banner>
                    )}
                    
                    {analytics.isExpiringSoon && (
                      <Banner status="info">
                        <p>Your subscription expires in {analytics.remainingDays} days.</p>
                      </Banner>
                    )}
                  </BlockStack>
                )}
                
                <Text variant="bodySm" color="subdued">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </Text>
              </BlockStack>
            </Card>
          ) : (
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Welcome to Jarvis AI! 🚀
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Start with a free trial to explore all features
                </Text>
                <Banner status="info">
                  <p>No active subscription found. Start your free trial to begin using Jarvis AI features!</p>
                </Banner>
                <Button
                  primary
                  size="large"
                  onClick={handleStartTrial}
                >
                  🎉 Start Free Trial (14 Days)
                </Button>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
        
        {/* Available Plans */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text variant="headingMd" as="h2">
                Choose Your Plan
              </Text>
              
              {plans.length === 0 ? (
                <Banner status="warning">
                  <p>No billing plans available. Please contact support.</p>
                </Banner>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  {plans.map((plan) => {
                    const isCurrentPlan = subscription?.planId === plan.id;
                    const isFreePlan = plan.price === 0;
                    
                    return (
                      <div
                        key={plan.id}
                        style={{
                          border: isCurrentPlan ? '3px solid #00a847' : '2px solid #e1e5e9',
                          borderRadius: '12px',
                          padding: '24px',
                          backgroundColor: 'white',
                          position: 'relative'
                        }}
                      >
                        {isCurrentPlan && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '20px',
                            backgroundColor: '#00a847',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            CURRENT PLAN
                          </div>
                        )}
                        
                        {isFreePlan && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            FREE
                          </div>
                        )}
                        
                        <BlockStack gap="300">
                          <Text variant="headingLg" as="h3">
                            {plan.name}
                          </Text>
                          
                          <div>
                            <Text variant="heading2xl" as="p">
                              ${plan.price}
                            </Text>
                            <Text variant="bodyMd" color="subdued">
                              per {plan.billingCycle === 'MONTHLY' ? 'month' : 'year'}
                            </Text>
                          </div>
                          
                          <List>
                            <List.Item>{plan.messagesLimit.toLocaleString()} messages per month</List.Item>
                            {plan.features && plan.features.map((feature, index) => (
                              <List.Item key={index}>{feature}</List.Item>
                            ))}
                          </List>
                          
                          <Button
                            primary={!isCurrentPlan}
                            disabled={isCurrentPlan}
                            size="large"
                            onClick={() => handlePlanSelect(plan.id)}
                            fullWidth
                          >
                            {isCurrentPlan ? 'Current Plan' : `Select ${plan.name}`}
                          </Button>
                        </BlockStack>
                      </div>
                    );
                  })}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        {/* Demo Notice */}
        <Layout.Section>
          <Banner status="info">
            <BlockStack gap="200">
              <Text variant="bodyMd" fontWeight="semibold">
                Demo Mode Notice
              </Text>
              <Text variant="bodyMd">
                This is a demonstration of the billing system. In production, this would integrate with Shopify's 
                native billing API for secure payment processing. No actual charges will be made.
              </Text>
            </BlockStack>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
