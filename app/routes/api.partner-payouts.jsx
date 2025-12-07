/**
 * Partner Payouts Management API
 * Admin routes for managing partner payouts
 */

import { json } from '@remix-run/node';
import {
  generatePayoutCSV,
  markPayoutsPaid,
  getAgencyPayoutDetails,
  getAgenciesBelowThreshold,
  generatePayoutReport,
} from '../utils/payoutExport';
import { authenticate } from '../shopify.server';

/**
 * GET - Get payout report or CSV export
 * POST - Mark payouts as paid
 */

export const loader = async ({ request }) => {
  // Authenticate admin request
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const agencyId = url.searchParams.get('agencyId');
  
  try {
    // Export CSV
    if (action === 'export-csv') {
      const result = await generatePayoutCSV();
      
      if (!result.success) {
        return json({ error: result.message }, { status: 404 });
      }
      
      return new Response(result.csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=partner-payouts-${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    }
    
    // Get detailed report
    if (action === 'report') {
      const report = await generatePayoutReport();
      return json(report);
    }
    
    // Get agency details
    if (action === 'agency-details' && agencyId) {
      const details = await getAgencyPayoutDetails(agencyId);
      return json(details);
    }
    
    // Get agencies below threshold
    if (action === 'below-threshold') {
      const agencies = await getAgenciesBelowThreshold();
      return json({ agencies });
    }
    
    // Default: return payout report
    const report = await generatePayoutReport();
    return json(report);
    
  } catch (error) {
    console.error('Payout API error:', error);
    return json({ error: 'Failed to process request' }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  // Authenticate admin request
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const actionType = formData.get('action');
  
  try {
    // Mark payouts as paid
    if (actionType === 'mark-paid') {
      const payoutIdsString = formData.get('payoutIds');
      const paymentReference = formData.get('paymentReference');
      const paymentMethod = formData.get('paymentMethod') || 'manual';
      
      if (!payoutIdsString || !paymentReference) {
        return json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const payoutIds = payoutIdsString.split(',').map(id => id.trim());
      const count = await markPayoutsPaid(payoutIds, paymentReference, paymentMethod);
      
      return json({
        success: true,
        message: `Marked ${count} payouts as paid`,
        updatedCount: count,
      });
    }
    
    return json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Payout action error:', error);
    return json({ error: 'Failed to process action' }, { status: 500 });
  }
};
