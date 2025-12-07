/**
 * Agency Management API
 * Routes for creating and managing partner agencies
 */

import { json } from '@remix-run/node';
import prisma from '../db.server';
import { authenticate } from '../shopify.server';
import crypto from 'crypto';

/**
 * Generate unique referral code
 */
function generateReferralCode(name) {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${base}-${random}`;
}

/**
 * GET - List all agencies or get specific agency
 * POST - Create new agency
 * PUT - Update agency
 */

export const loader = async ({ request }) => {
  // Authenticate admin request
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const agencyId = url.searchParams.get('id');
  const includeStats = url.searchParams.get('includeStats') === 'true';
  
  try {
    // Get specific agency
    if (agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        include: {
          merchantReferrals: {
            where: { active: true },
            select: {
              shopDomain: true,
              referredAt: true,
              lifetimeRevenue: true,
              lastBilledAt: true,
            },
          },
          partnerPayouts: {
            orderBy: { monthFor: 'desc' },
            take: 12, // Last 12 months
          },
        },
      });
      
      if (!agency) {
        return json({ error: 'Agency not found' }, { status: 404 });
      }
      
      // Calculate stats
      const stats = {
        totalMerchants: agency.merchantReferrals.length,
        lifetimeRevenue: agency.merchantReferrals.reduce((sum, m) => sum + parseFloat(m.lifetimeRevenue), 0),
        totalEarned: agency.partnerPayouts.reduce((sum, p) => sum + parseFloat(p.commissionAmount), 0),
        unpaidBalance: agency.partnerPayouts
          .filter(p => !p.paid)
          .reduce((sum, p) => sum + parseFloat(p.commissionAmount), 0),
      };
      
      return json({ agency, stats });
    }
    
    // List all agencies
    const agencies = await prisma.agency.findMany({
      orderBy: { createdAt: 'desc' },
      include: includeStats ? {
        _count: {
          select: {
            merchantReferrals: true,
            partnerPayouts: true,
          },
        },
      } : undefined,
    });
    
    return json({ agencies, count: agencies.length });
    
  } catch (error) {
    console.error('Agency API error:', error);
    return json({ error: 'Failed to fetch agencies' }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  // Authenticate admin request
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const actionType = formData.get('action');
  
  try {
    // Create new agency
    if (actionType === 'create') {
      const name = formData.get('name');
      const email = formData.get('email');
      const paymentMethod = formData.get('paymentMethod');
      const paymentEmail = formData.get('paymentEmail');
      const minimumThreshold = parseFloat(formData.get('minimumThreshold') || '25.00');
      
      if (!name || !email) {
        return json({ error: 'Name and email are required' }, { status: 400 });
      }
      
      // Generate unique referral code
      let referralCode = generateReferralCode(name);
      
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.agency.findUnique({
          where: { referralCode },
        });
        if (!existing) break;
        referralCode = generateReferralCode(name);
        attempts++;
      }
      
      const agency = await prisma.agency.create({
        data: {
          name,
          email,
          referralCode,
          paymentMethod,
          paymentEmail: paymentEmail || email,
          minimumPayoutThreshold: minimumThreshold,
          active: true,
        },
      });
      
      return json({ success: true, agency });
    }
    
    // Update agency
    if (actionType === 'update') {
      const agencyId = formData.get('agencyId');
      const updateData = {};
      
      // Build update object from form data
      const fields = ['name', 'email', 'paymentMethod', 'paymentEmail', 'bankAccountEncrypted'];
      fields.forEach(field => {
        const value = formData.get(field);
        if (value !== null && value !== undefined) {
          updateData[field] = value;
        }
      });
      
      if (formData.get('minimumThreshold')) {
        updateData.minimumPayoutThreshold = parseFloat(formData.get('minimumThreshold'));
      }
      
      if (formData.get('active') !== null) {
        updateData.active = formData.get('active') === 'true';
      }
      
      if (formData.get('paymentVerified') !== null) {
        updateData.paymentVerified = formData.get('paymentVerified') === 'true';
      }
      
      const agency = await prisma.agency.update({
        where: { id: agencyId },
        data: updateData,
      });
      
      return json({ success: true, agency });
    }
    
    // Link merchant to agency
    if (actionType === 'link-merchant') {
      const shopDomain = formData.get('shopDomain');
      const agencyId = formData.get('agencyId');
      
      if (!shopDomain || !agencyId) {
        return json({ error: 'Shop domain and agency ID are required' }, { status: 400 });
      }
      
      const referral = await prisma.merchantReferral.create({
        data: {
          shopDomain,
          agencyId,
          active: true,
        },
      });
      
      return json({ success: true, referral });
    }
    
    return json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Agency action error:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return json({ error: 'Email or referral code already exists' }, { status: 409 });
    }
    
    return json({ error: 'Failed to process action' }, { status: 500 });
  }
};
