/**
 * Wait for deployment and test agency creation
 */

const API_URL = 'https://jarvis2-0-djg1.onrender.com/api/partner-agencies';

const agencyData = {
  name: "Digital Marketing Pro",
  email: "payments@digitalmarketingpro.com",
  referralCode: "DIGITAL2025",
  paymentMethod: "paypal",
  paymentEmail: "payments@digitalmarketingpro.com"
};

async function checkDeployment() {
  console.log('⏳ Checking if deployment is ready...\n');
  
  try {
    const response = await fetch(API_URL);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      console.log('✅ Deployment is ready!\n');
      return true;
    } else {
      console.log('⚠️  Still deploying (receiving HTML instead of JSON)...\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Server not responding:', error.message, '\n');
    return false;
  }
}

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

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      console.log('❌ Server returned HTML instead of JSON');
      console.log('Status:', response.status);
      console.log('\n💡 The deployment might not be complete yet.');
      console.log('   Wait 1-2 minutes and run this script again.\n');
      return;
    }

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!\n');
      console.log('═══════════════════════════════════════════════');
      console.log('Agency Name:', result.agency.name);
      console.log('Referral Code:', result.agency.referralCode);
      console.log('Email:', result.agency.email);
      console.log('Payment Method:', result.agency.paymentMethod);
      console.log('═══════════════════════════════════════════════');
      console.log('\n📎 REFERRAL LINK:');
      console.log('   ' + result.referralLink);
      console.log('\n💡 Share this link with merchants to track referrals!');
      console.log('\n✨ Every merchant who installs through this link will');
      console.log('   earn Digital Marketing Pro 25% commission!\n');
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

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   Partner Agency Creation Test                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  const isReady = await checkDeployment();
  
  if (!isReady) {
    console.log('⏱️  Waiting 30 seconds for deployment to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const stillReady = await checkDeployment();
    if (!stillReady) {
      console.log('❌ Deployment not ready yet. Please wait and try again in 1-2 minutes.\n');
      return;
    }
  }
  
  await createAgency();
}

main();
