/**
 * Partner Program Webhook Handler
 * Processes Shopify billing webhooks and records commissions (25%)
 */

import crypto from 'crypto';
import prisma from '../db.server';

/**
 * Verify Shopify webhook authenticity
 */
export function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) return false;
  
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmacHeader)
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Extract billing amount from webhook payload
 */
export function extractAmountFromPayload(payload, topic) {
  try {
    // For app_subscriptions/update (GraphQL subscriptions)
    if (topic === 'app_subscriptions/update') {
      const lineItems = payload.app_subscription?.line_items || [];
      if (lineItems.length > 0) {
        return parseFloat(lineItems[0]?.plan?.pricing_details?.price?.amount || 0);
      }
    }
    
    // For recurring_application_charges/activated (REST API)
    if (topic === 'recurring_application_charges/activated') {
      return parseFloat(payload.price || 0);
    }
    
    // For app_purchases_one_time/update
    if (topic === 'app_purchases_one_time/update') {
      return parseFloat(payload.admin_graphql_api_price?.amount || 0);
    }
    
    return 0;
  } catch (error) {
    console.error('Error extracting amount from payload:', error);
    return 0;
  }
}

/**
 * Process billing webhook and update payouts
 */
export async function processBillingWebhook(shop, amount, agencyId) {
  try {
    // Use Prisma transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Update merchant referral record
      const merchantReferral = await tx.merchantReferral.upsert({
        where: { shopDomain: shop },
        update: {
          lastBilledAmount: amount,
          lastBilledAt: new Date(),
          lifetimeRevenue: {
            increment: amount,
          },
        },
        create: {
          shopDomain: shop,
          agencyId: agencyId,
          lastBilledAmount: amount,
          lastBilledAt: new Date(),
          lifetimeRevenue: amount,
          active: true,
        },
      });
      
      // Calculate commission (25%)
      const commission = amount * 0.25;
      
      // Get current month (first day)
      const monthFor = new Date();
      monthFor.setUTCDate(1);
      monthFor.setUTCHours(0, 0, 0, 0);
      
      // Upsert payout ledger entry
      const payout = await tx.partnerPayout.upsert({
        where: {
          agencyId_monthFor: {
            agencyId: agencyId,
            monthFor: monthFor,
          },
        },
        update: {
          grossAmount: {
            increment: amount,
          },
          commissionAmount: {
            increment: commission,
          },
        },
        create: {
          agencyId: agencyId,
          monthFor: monthFor,
          grossAmount: amount,
          commissionAmount: commission,
          commissionRate: 0.25,
        },
      });
      
      return { merchantReferral, payout };
    });
    
    console.log(`✅ Processed billing for ${shop}: $${amount}, commission: $${amount * 0.25}`);
    return result;
  } catch (error) {
    console.error('❌ Error processing billing webhook:', error);
    throw error;
  }
}

/**
 * Handle app uninstall - mark merchant as inactive
 */
export async function handleAppUninstall(shop) {
  try {
    await prisma.merchantReferral.updateMany({
      where: { shopDomain: shop },
      data: { active: false },
    });
    
    console.log(`✅ Marked ${shop} as inactive`);
  } catch (error) {
    console.error('❌ Error handling app uninstall:', error);
    throw error;
  }
}

/**
 * Main webhook handler
 */
export async function handlePartnerBillingWebhook(request) {
  try {
    const topic = request.headers.get('X-Shopify-Topic');
    const shop = request.headers.get('X-Shopify-Shop-Domain');
    const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
    
    // Get raw body for HMAC verification
    const rawBody = await request.text();
    
    // Verify webhook
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret)) {
      console.error('❌ Invalid HMAC signature');
      return new Response('Unauthorized', { status: 401 });
    }
    
    const payload = JSON.parse(rawBody);
    console.log(`📥 Webhook received: ${topic} from ${shop}`);
    
    // Handle billing events
    if (
      topic === 'app_subscriptions/update' ||
      topic === 'recurring_application_charges/activated' ||
      topic === 'app_purchases_one_time/update'
    ) {
      const amount = extractAmountFromPayload(payload, topic);
      
      if (amount <= 0) {
        console.log('⚠️ No valid amount found in payload');
        return new Response('OK', { status: 200 });
      }
      
      // Get merchant referral info
      const merchantReferral = await prisma.merchantReferral.findUnique({
        where: { shopDomain: shop },
        include: { agency: true },
      });
      
      if (merchantReferral && merchantReferral.active && merchantReferral.agencyId) {
        await processBillingWebhook(shop, amount, merchantReferral.agencyId);
      } else {
        console.log(`⚠️ No active agency referral found for ${shop}`);
      }
    }
    
    // Handle app uninstall
    else if (topic === 'app/uninstalled') {
      await handleAppUninstall(shop);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
