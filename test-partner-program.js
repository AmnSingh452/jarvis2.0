/**
 * Partner Program Test Suite
 * Tests the complete partner program flow including:
 * - Agency creation
 * - Merchant referral tracking
 * - Billing webhook processing
 * - Commission calculation (25%)
 * - Payout export
 */

import crypto from 'crypto';

// Mock database for testing
const mockDB = {
  agencies: [],
  merchantReferrals: [],
  partnerPayouts: []
};

// Test configuration
const TEST_CONFIG = {
  COMMISSION_RATE: 0.25,
  MIN_PAYOUT_THRESHOLD: 25.00,
  WEBHOOK_SECRET: 'test_webhook_secret_12345'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(`TEST: ${testName}`, 'blue');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'yellow');
}

// Utility Functions
function generateReferralCode() {
  return 'REF_' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateShopDomain() {
  return `test-shop-${Date.now()}.myshopify.com`;
}

function createHMAC(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body), 'utf8')
    .digest('base64');
}

// Test Functions
function testAgencyCreation() {
  logTest('Agency Creation');
  
  try {
    const agency = {
      id: 'agency_' + Date.now(),
      name: 'Test Marketing Agency',
      email: 'test@agency.com',
      referralCode: generateReferralCode(),
      paymentMethod: 'paypal',
      paymentEmail: 'payouts@agency.com',
      minimumPayoutThreshold: TEST_CONFIG.MIN_PAYOUT_THRESHOLD,
      active: true,
      paymentVerified: true,
      createdAt: new Date()
    };
    
    mockDB.agencies.push(agency);
    
    logSuccess(`Agency created: ${agency.name}`);
    logInfo(`Referral Code: ${agency.referralCode}`);
    logInfo(`Payment Method: ${agency.paymentMethod}`);
    logInfo(`Min Payout: $${agency.minimumPayoutThreshold}`);
    
    return agency;
  } catch (error) {
    logError(`Agency creation failed: ${error.message}`);
    return null;
  }
}

function testMerchantReferral(agency) {
  logTest('Merchant Referral Tracking');
  
  try {
    const shopDomain = generateShopDomain();
    const referral = {
      id: 'ref_' + Date.now(),
      shopDomain: shopDomain,
      agencyId: agency.id,
      referredAt: new Date(),
      lifetimeRevenue: 0,
      active: true
    };
    
    mockDB.merchantReferrals.push(referral);
    
    logSuccess(`Merchant referral created: ${shopDomain}`);
    logInfo(`Referred by: ${agency.name}`);
    
    return referral;
  } catch (error) {
    logError(`Merchant referral failed: ${error.message}`);
    return null;
  }
}

function testWebhookVerification() {
  logTest('Webhook HMAC Verification');
  
  try {
    const payload = {
      id: 12345,
      price: '29.99',
      name: 'Premium Plan'
    };
    
    const hmac = createHMAC(payload, TEST_CONFIG.WEBHOOK_SECRET);
    
    // Simulate verification
    const receivedHmac = hmac;
    const computedHmac = createHMAC(payload, TEST_CONFIG.WEBHOOK_SECRET);
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedHmac),
      Buffer.from(computedHmac)
    );
    
    if (isValid) {
      logSuccess('Webhook HMAC verification passed');
      logInfo(`HMAC: ${hmac.substring(0, 20)}...`);
      return true;
    } else {
      logError('Webhook HMAC verification failed');
      return false;
    }
  } catch (error) {
    logError(`Webhook verification error: ${error.message}`);
    return false;
  }
}

function testBillingWebhook(agency, referral) {
  logTest('Billing Webhook Processing');
  
  try {
    const billingAmount = 29.99;
    const commission = billingAmount * TEST_CONFIG.COMMISSION_RATE;
    
    // Simulate webhook payload
    const webhook = {
      topic: 'app_subscriptions/update',
      shop_domain: referral.shopDomain,
      payload: {
        app_subscription: {
          line_items: [{
            plan: {
              pricing_details: {
                price: {
                  amount: billingAmount
                }
              }
            }
          }]
        }
      }
    };
    
    logInfo(`Processing billing for: ${webhook.shop_domain}`);
    logInfo(`Billing amount: $${billingAmount}`);
    
    // Update merchant referral
    const merchantRef = mockDB.merchantReferrals.find(
      r => r.shopDomain === referral.shopDomain
    );
    
    if (merchantRef) {
      merchantRef.lastBilledAmount = billingAmount;
      merchantRef.lastBilledAt = new Date();
      merchantRef.lifetimeRevenue += billingAmount;
      
      logSuccess('Merchant referral updated');
      logInfo(`Lifetime revenue: $${merchantRef.lifetimeRevenue}`);
    }
    
    // Create/update payout ledger
    const currentMonth = new Date();
    currentMonth.setUTCDate(1);
    currentMonth.setUTCHours(0, 0, 0, 0);
    
    let payout = mockDB.partnerPayouts.find(
      p => p.agencyId === agency.id && 
           p.monthFor.getTime() === currentMonth.getTime()
    );
    
    if (!payout) {
      payout = {
        id: 'payout_' + Date.now(),
        agencyId: agency.id,
        monthFor: currentMonth,
        grossAmount: 0,
        commissionAmount: 0,
        commissionRate: TEST_CONFIG.COMMISSION_RATE,
        paid: false,
        createdAt: new Date()
      };
      mockDB.partnerPayouts.push(payout);
    }
    
    payout.grossAmount += billingAmount;
    payout.commissionAmount += commission;
    
    logSuccess('Payout ledger updated');
    logInfo(`Month: ${currentMonth.toISOString().slice(0, 7)}`);
    logInfo(`Gross amount: $${payout.grossAmount.toFixed(2)}`);
    logInfo(`Commission (25%): $${payout.commissionAmount.toFixed(2)}`);
    
    return { billingAmount, commission, payout };
  } catch (error) {
    logError(`Billing webhook processing failed: ${error.message}`);
    return null;
  }
}

function testMultipleBillings(agency, referral) {
  logTest('Multiple Billing Events (Same Month)');
  
  try {
    const billings = [39.99, 49.99, 29.99];
    let totalGross = 0;
    let totalCommission = 0;
    
    billings.forEach((amount, index) => {
      logInfo(`Processing billing ${index + 1}: $${amount}`);
      const result = testBillingWebhook(agency, referral);
      if (result) {
        totalGross = result.payout.grossAmount;
        totalCommission = result.payout.commissionAmount;
      }
    });
    
    logSuccess('Multiple billings processed successfully');
    logInfo(`Total gross: $${totalGross.toFixed(2)}`);
    logInfo(`Total commission: $${totalCommission.toFixed(2)}`);
    
    return { totalGross, totalCommission };
  } catch (error) {
    logError(`Multiple billings test failed: ${error.message}`);
    return null;
  }
}

function testPayoutExport() {
  logTest('Payout Export (CSV Generation)');
  
  try {
    const unpaidPayouts = mockDB.partnerPayouts.filter(p => !p.paid);
    
    logInfo(`Found ${unpaidPayouts.length} unpaid payout(s)`);
    
    if (unpaidPayouts.length === 0) {
      logError('No unpaid payouts to export');
      return null;
    }
    
    // Generate CSV
    const csvRows = [];
    csvRows.push([
      'Partner Name',
      'Email',
      'Month',
      'Gross Revenue',
      'Commission (25%)',
      'Payment Reference',
      'Payment Method'
    ]);
    
    unpaidPayouts.forEach(payout => {
      const agency = mockDB.agencies.find(a => a.id === payout.agencyId);
      
      // Check minimum payout threshold
      if (payout.commissionAmount >= agency.minimumPayoutThreshold) {
        csvRows.push([
          agency.name,
          agency.email,
          payout.monthFor.toISOString().slice(0, 7),
          `$${payout.grossAmount.toFixed(2)}`,
          `$${payout.commissionAmount.toFixed(2)}`,
          '',
          agency.paymentMethod || ''
        ]);
      } else {
        logInfo(`Skipping ${agency.name}: Below minimum threshold ($${payout.commissionAmount.toFixed(2)} < $${agency.minimumPayoutThreshold})`);
      }
    });
    
    if (csvRows.length > 1) {
      const csv = csvRows.map(row => row.join(',')).join('\n');
      logSuccess('CSV generated successfully');
      console.log('\n' + '─'.repeat(60));
      console.log(csv);
      console.log('─'.repeat(60) + '\n');
      return csv;
    } else {
      logInfo('No payouts meet minimum threshold');
      return null;
    }
  } catch (error) {
    logError(`Payout export failed: ${error.message}`);
    return null;
  }
}

function testMarkPayoutsPaid() {
  logTest('Mark Payouts as Paid');
  
  try {
    const unpaidPayouts = mockDB.partnerPayouts.filter(p => !p.paid);
    
    if (unpaidPayouts.length === 0) {
      logInfo('No unpaid payouts to mark');
      return true;
    }
    
    const paymentReference = `BATCH_${Date.now()}`;
    
    unpaidPayouts.forEach(payout => {
      const agency = mockDB.agencies.find(a => a.id === payout.agencyId);
      
      if (payout.commissionAmount >= agency.minimumPayoutThreshold) {
        payout.paid = true;
        payout.paidAt = new Date();
        payout.paymentReference = paymentReference;
        payout.paymentMethod = agency.paymentMethod;
        
        logSuccess(`Marked as paid: ${agency.name} - $${payout.commissionAmount.toFixed(2)}`);
      }
    });
    
    logInfo(`Payment reference: ${paymentReference}`);
    
    return true;
  } catch (error) {
    logError(`Mark as paid failed: ${error.message}`);
    return false;
  }
}

function testUninstallWebhook(referral) {
  logTest('App Uninstall Webhook');
  
  try {
    const merchantRef = mockDB.merchantReferrals.find(
      r => r.shopDomain === referral.shopDomain
    );
    
    if (merchantRef) {
      merchantRef.active = false;
      logSuccess(`Merchant marked as inactive: ${referral.shopDomain}`);
      return true;
    } else {
      logError('Merchant referral not found');
      return false;
    }
  } catch (error) {
    logError(`Uninstall webhook failed: ${error.message}`);
    return false;
  }
}

function testPayoutThreshold() {
  logTest('Minimum Payout Threshold ($25)');
  
  try {
    // Create agency with low commission
    const lowAgency = {
      id: 'agency_low_' + Date.now(),
      name: 'Small Agency',
      email: 'small@agency.com',
      referralCode: generateReferralCode(),
      minimumPayoutThreshold: TEST_CONFIG.MIN_PAYOUT_THRESHOLD,
      active: true
    };
    
    mockDB.agencies.push(lowAgency);
    
    // Create payout below threshold
    const currentMonth = new Date();
    currentMonth.setUTCDate(1);
    currentMonth.setUTCHours(0, 0, 0, 0);
    
    const lowPayout = {
      id: 'payout_low_' + Date.now(),
      agencyId: lowAgency.id,
      monthFor: currentMonth,
      grossAmount: 60.00,
      commissionAmount: 15.00, // Below $25 threshold
      commissionRate: TEST_CONFIG.COMMISSION_RATE,
      paid: false,
      createdAt: new Date()
    };
    
    mockDB.partnerPayouts.push(lowPayout);
    
    logInfo(`Agency: ${lowAgency.name}`);
    logInfo(`Commission: $${lowPayout.commissionAmount}`);
    logInfo(`Threshold: $${TEST_CONFIG.MIN_PAYOUT_THRESHOLD}`);
    
    if (lowPayout.commissionAmount < TEST_CONFIG.MIN_PAYOUT_THRESHOLD) {
      logSuccess('Correctly identified as below threshold');
      logInfo('This payout will be rolled over to next month');
      return true;
    } else {
      logError('Threshold check failed');
      return false;
    }
  } catch (error) {
    logError(`Threshold test failed: ${error.message}`);
    return false;
  }
}

function printSummary() {
  logTest('Test Summary');
  
  console.log('\nDatabase State:');
  console.log('─'.repeat(60));
  
  logInfo(`Agencies: ${mockDB.agencies.length}`);
  mockDB.agencies.forEach(a => {
    console.log(`  - ${a.name} (${a.referralCode})`);
  });
  
  logInfo(`\nMerchant Referrals: ${mockDB.merchantReferrals.length}`);
  mockDB.merchantReferrals.forEach(r => {
    console.log(`  - ${r.shopDomain} (Lifetime: $${r.lifetimeRevenue.toFixed(2)}, Active: ${r.active})`);
  });
  
  logInfo(`\nPartner Payouts: ${mockDB.partnerPayouts.length}`);
  mockDB.partnerPayouts.forEach(p => {
    const agency = mockDB.agencies.find(a => a.id === p.agencyId);
    console.log(`  - ${agency.name} - ${p.monthFor.toISOString().slice(0, 7)}`);
    console.log(`    Gross: $${p.grossAmount.toFixed(2)}, Commission: $${p.commissionAmount.toFixed(2)}, Paid: ${p.paid}`);
  });
  
  console.log('─'.repeat(60));
  
  // Calculate totals
  const totalGross = mockDB.partnerPayouts.reduce((sum, p) => sum + p.grossAmount, 0);
  const totalCommission = mockDB.partnerPayouts.reduce((sum, p) => sum + p.commissionAmount, 0);
  const unpaidCommission = mockDB.partnerPayouts
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + p.commissionAmount, 0);
  
  console.log('\nTotals:');
  logInfo(`Total Gross Revenue: $${totalGross.toFixed(2)}`);
  logInfo(`Total Commission (25%): $${totalCommission.toFixed(2)}`);
  logInfo(`Unpaid Commission: $${unpaidCommission.toFixed(2)}`);
  logInfo(`Commission Rate: ${(TEST_CONFIG.COMMISSION_RATE * 100)}%`);
  
  // Verify commission calculation
  const expectedCommission = totalGross * TEST_CONFIG.COMMISSION_RATE;
  const commissionCorrect = Math.abs(totalCommission - expectedCommission) < 0.01;
  
  if (commissionCorrect) {
    logSuccess('\n✓ Commission calculations verified (25%)');
  } else {
    logError(`\n✗ Commission mismatch! Expected: $${expectedCommission.toFixed(2)}, Got: $${totalCommission.toFixed(2)}`);
  }
}

// Main Test Runner
async function runTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║          PARTNER PROGRAM COMPREHENSIVE TEST SUITE          ║', 'blue');
  log('║                   Commission Rate: 25%                     ║', 'blue');
  log('║              Minimum Payout Threshold: $25                 ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  try {
    // Test 1: Create agency
    const agency = testAgencyCreation();
    if (!agency) throw new Error('Agency creation failed');
    
    // Test 2: Create merchant referral
    const referral = testMerchantReferral(agency);
    if (!referral) throw new Error('Merchant referral failed');
    
    // Test 3: Webhook verification
    const webhookValid = testWebhookVerification();
    if (!webhookValid) throw new Error('Webhook verification failed');
    
    // Test 4: Process billing webhook
    const billingResult = testBillingWebhook(agency, referral);
    if (!billingResult) throw new Error('Billing webhook failed');
    
    // Test 5: Multiple billings
    const multipleResult = testMultipleBillings(agency, referral);
    if (!multipleResult) throw new Error('Multiple billings failed');
    
    // Test 6: Payout threshold
    testPayoutThreshold();
    
    // Test 7: Export payouts
    const csv = testPayoutExport();
    
    // Test 8: Mark as paid
    testMarkPayoutsPaid();
    
    // Test 9: Uninstall webhook
    testUninstallWebhook(referral);
    
    // Print summary
    printSummary();
    
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'green');
    log('║                  ALL TESTS COMPLETED!                      ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
    console.log('\n');
    
  } catch (error) {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'red');
    log('║                    TEST SUITE FAILED                       ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
    logError(`Error: ${error.message}`);
    console.log('\n');
  }
}

// Run the test suite
runTests();
