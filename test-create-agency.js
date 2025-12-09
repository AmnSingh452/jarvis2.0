/**
 * Test script to create a partner agency
 */

const API_URL = 'https://jarvis2-0-djg1.onrender.com/api/partner-agencies';

const agencyData = {
  name: "Digital Marketing Pro",
  email: "payments@digitalmarketingpro.com",
  referralCode: "DIGITAL2025",
  paymentMethod: "paypal",
  paymentEmail: "payments@digitalmarketingpro.com"
};

async function createAgency() {
  console.log('🚀 Creating partner agency...\n');
  console.log('URL:', API_URL);
  console.log('Data:', JSON.stringify(agencyData, null, 2), '\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agencyData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!\n');
      console.log('Agency created:', result.agency.name);
      console.log('Referral Code:', result.agency.referralCode);
      console.log('Email:', result.agency.email);
      console.log('Payment Method:', result.agency.paymentMethod);
      console.log('\n📎 Referral Link:');
      console.log(result.referralLink);
      console.log('\n💡 Share this link with merchants to track referrals!');
    } else {
      console.log('❌ FAILED\n');
      console.log('Status:', response.status);
      console.log('Error:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

createAgency();
