/**
 * Partner Billing Webhook Route
 * Handles Shopify billing webhooks for partner program
 */

import { handlePartnerBillingWebhook } from '../utils/partnerWebhooks';

export const action = async ({ request }) => {
  return await handlePartnerBillingWebhook(request);
};
