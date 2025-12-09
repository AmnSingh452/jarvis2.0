// Catch-all API handler with CORS support
import { json } from '@remix-run/node';
import prisma from '../db.server';
import crypto from 'crypto';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

function generateReferralCode(name) {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${base}-${random}`;
}

export async function loader({ params, request }) {
  const path = params['*'];
  
  // Handle /api/partner-agencies
  if (path === 'partner-agencies') {
    const url = new URL(request.url);
    const agencyId = url.searchParams.get('id');
    
    try {
      if (agencyId) {
        const agency = await prisma.agency.findUnique({
          where: { id: agencyId },
          include: {
            merchantReferrals: { where: { active: true } },
            partnerPayouts: { orderBy: { monthFor: 'desc' }, take: 12 },
          },
        });
        
        if (!agency) {
          return json({ error: 'Agency not found' }, { status: 404, headers: corsHeaders });
        }
        
        return json({ agency }, { headers: corsHeaders });
      }
      
      const agencies = await prisma.agency.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      return json({ agencies, count: agencies.length }, { headers: corsHeaders });
    } catch (error) {
      console.error('Agency API error:', error);
      return json({ error: 'Failed to fetch agencies' }, { status: 500, headers: corsHeaders });
    }
  }
  
  return new Response("API endpoint not found", {
    status: 404,
    headers: corsHeaders
  });
}

export async function action({ params, request }) {
  const path = params['*'];
  
  // Handle /api/partner-agencies
  if (path === 'partner-agencies') {
    try {
      const body = await request.json();
      const { name, email, referralCode, paymentMethod, paymentEmail, minimumThreshold } = body;
      
      if (!name || !email) {
        return json({ error: 'Name and email are required' }, { status: 400, headers: corsHeaders });
      }
      
      let finalReferralCode = referralCode || generateReferralCode(name);
      
      // Ensure uniqueness
      if (!referralCode) {
        let attempts = 0;
        while (attempts < 10) {
          const existing = await prisma.agency.findUnique({
            where: { referralCode: finalReferralCode },
          });
          if (!existing) break;
          finalReferralCode = generateReferralCode(name);
          attempts++;
        }
      }
      
      const agency = await prisma.agency.create({
        data: {
          name,
          email,
          referralCode: finalReferralCode,
          paymentMethod: paymentMethod || 'paypal',
          paymentEmail: paymentEmail || email,
          minimumPayoutThreshold: parseFloat(minimumThreshold || '25.00'),
          active: true,
        },
      });
      
      return json({ 
        success: true, 
        agency,
        referralLink: `${process.env.SHOPIFY_APP_URL || 'https://jarvis2-0-djg1.onrender.com'}/install?ref=${agency.referralCode}`
      }, { headers: corsHeaders });
      
    } catch (error) {
      console.error('Agency creation error:', error);
      
      if (error.code === 'P2002') {
        return json({ error: 'Email or referral code already exists' }, { status: 409, headers: corsHeaders });
      }
      
      return json({ error: 'Failed to create agency', details: error.message }, { status: 500, headers: corsHeaders });
    }
  }
  
  return new Response("API endpoint not found", {
    status: 404,
    headers: corsHeaders
  });
}
