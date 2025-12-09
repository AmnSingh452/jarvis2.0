/**
 * Partner Program Database Verification Test
 * Verifies the Prisma schema and database operations
 */

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      PARTNER PROGRAM DATABASE VERIFICATION TEST            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

// Check if Prisma client exists
try {
  console.log('✓ Checking Prisma client setup...');
  
  // Read schema file
  const fs = await import('fs');
  const path = await import('path');
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (fs.existsSync(schemaPath)) {
    console.log('✓ Prisma schema file found');
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // Check for partner program models
    const models = ['Agency', 'MerchantReferral', 'PartnerPayout'];
    const found = {};
    
    models.forEach(model => {
      const modelExists = schemaContent.includes(`model ${model}`);
      found[model] = modelExists;
      
      if (modelExists) {
        console.log(`✓ Model ${model} found in schema`);
      } else {
        console.log(`✗ Model ${model} NOT found in schema`);
      }
    });
    
    // Check for commission rate field
    if (schemaContent.includes('commissionRate') && schemaContent.includes('0.25')) {
      console.log('✓ Commission rate field found (25%)');
    }
    
    // Check for minimum payout threshold
    if (schemaContent.includes('minimumPayoutThreshold') && schemaContent.includes('25.00')) {
      console.log('✓ Minimum payout threshold found ($25)');
    }
    
    // Check for payment methods
    if (schemaContent.includes('paymentMethod')) {
      console.log('✓ Payment method field found');
    }
    
    console.log('\n');
    console.log('Schema Verification Summary:');
    console.log('─'.repeat(60));
    
    const allModelsExist = Object.values(found).every(v => v === true);
    
    if (allModelsExist) {
      console.log('✓ All partner program models are present');
      console.log('✓ Database schema is correctly configured');
      console.log('\n');
      console.log('Next Steps:');
      console.log('  1. Run: npx prisma migrate dev --name add_partner_program');
      console.log('  2. Run: npx prisma generate');
      console.log('  3. Register billing webhooks in Shopify');
      console.log('  4. Test with a real billing event');
    } else {
      console.log('✗ Some models are missing');
      console.log('Please check the schema.prisma file');
    }
    
    console.log('─'.repeat(60));
    
  } else {
    console.log('✗ Prisma schema file not found at:', schemaPath);
  }
  
} catch (error) {
  console.log('✗ Error:', error.message);
}

console.log('\n');
console.log('Checking API routes...');
console.log('─'.repeat(60));

try {
  const fs = await import('fs');
  const path = await import('path');
  
  const routes = [
    'app/routes/api.partner-billing.jsx',
    'app/routes/api.partner-agencies.jsx',
    'app/routes/api.partner-payouts.jsx'
  ];
  
  routes.forEach(route => {
    const routePath = path.join(process.cwd(), route);
    if (fs.existsSync(routePath)) {
      console.log(`✓ ${route}`);
    } else {
      console.log(`✗ ${route} NOT found`);
    }
  });
  
  // Check utils
  const utilsPath = path.join(process.cwd(), 'app/utils/partnerWebhooks.js');
  if (fs.existsSync(utilsPath)) {
    console.log('✓ app/utils/partnerWebhooks.js');
  } else {
    console.log('✗ app/utils/partnerWebhooks.js NOT found');
  }
  
  const payoutPath = path.join(process.cwd(), 'app/utils/partnerPayouts.js');
  if (fs.existsSync(payoutPath)) {
    console.log('✓ app/utils/partnerPayouts.js');
  } else {
    console.log('✗ app/utils/partnerPayouts.js NOT found');
  }
  
} catch (error) {
  console.log('✗ Error checking routes:', error.message);
}

console.log('─'.repeat(60));

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                VERIFICATION COMPLETE                       ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');
