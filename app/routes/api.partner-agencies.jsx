/**
 * Agency Management API
 * Routes for creating and managing partner agencies
 * URL: POST /api/partner-agencies
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
        lifetimeRevenue: agency.merchantReferrals.reduce((sum, m) => sum + parseFloat(m.lifetimeRevenue || 0), 0),
        totalEarned: agency.partnerPayouts.reduce((sum, p) => sum + parseFloat(p.commissionAmount || 0), 0),
        unpaidBalance: agency.partnerPayouts
          .filter(p => !p.paid)
          .reduce((sum, p) => sum + parseFloat(p.commissionAmount || 0), 0),
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
    return json({ error: 'Failed to fetch agencies', details: error.message }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    // Parse JSON body or FormData
    let data;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
    }
    
    const actionType = data.action || 'create';
    
    // Create new agency
    if (actionType === 'create' || request.method === 'POST') {
      const { name, email, paymentMethod, paymentEmail, referralCode: customCode, minimumThreshold } = data;
      
      if (!name || !email) {
        return json({ error: 'Name and email are required' }, { status: 400 });
      }
      
      // Use custom referral code or generate one
      let referralCode = customCode;
      
      if (!referralCode) {
        referralCode = generateReferralCode(name);
        
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
      }
      
      const agency = await prisma.agency.create({
        data: {
          name,
          email,
          referralCode,
          paymentMethod: paymentMethod || 'paypal',
          paymentEmail: paymentEmail || email,
          minimumPayoutThreshold: parseFloat(minimumThreshold || '25.00'),
          active: true,
        },
      });
      
      // Return agency with referral link
      const baseUrl = process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com';
      
      return json({ 
        success: true, 
        agency,
        referralLink: `${baseUrl}/install?ref=${agency.referralCode}`,
        message: `Agency created successfully! Share this link: ${baseUrl}/install?ref=${agency.referralCode}`
      });
    }
    
    // Update agency
    if (actionType === 'update') {
      const { agencyId, minimumThreshold, active, paymentVerified, ...fields } = data;
      const updateData = {};
      
      // Build update object
      const allowedFields = ['name', 'email', 'paymentMethod', 'paymentEmail', 'bankAccountEncrypted'];
      allowedFields.forEach(field => {
        if (fields[field] !== null && fields[field] !== undefined) {
          updateData[field] = fields[field];
        }
      });
      
      if (minimumThreshold) {
        updateData.minimumPayoutThreshold = parseFloat(minimumThreshold);
      }
      
      if (active !== null && active !== undefined) {
        updateData.active = active === true || active === 'true';
      }
      
      if (paymentVerified !== null && paymentVerified !== undefined) {
        updateData.paymentVerified = paymentVerified === true || paymentVerified === 'true';
      }
      
      const agency = await prisma.agency.update({
        where: { id: agencyId },
        data: updateData,
      });
      
      return json({ success: true, agency });
    }
    
    // Link merchant to agency
    if (actionType === 'link-merchant') {
      const { shopDomain, agencyId } = data;
      
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
    
    return json({ 
      error: 'Failed to process action', 
      details: error.message 
    }, { status: 500 });
  }
};
