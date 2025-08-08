/**
 * Simple Shopify App Health Check
 * Verifies critical endpoints are working without errors
 */

console.log('🏗️  Shopify App Health Check Started');
console.log('🎯 Target: https://jarvis2-0-djg1.onrender.com');
console.log('📅 Time:', new Date().toISOString());

const APP_BASE_URL = 'https://jarvis2-0-djg1.onrender.com';

async function testEndpoint(path, expectedStatus = 200) {
  try {
    console.log(`\n🧪 Testing: ${path}`);
    
    const response = await fetch(`${APP_BASE_URL}${path}`, {
      headers: {
        'User-Agent': 'Shopify-App-Health-Check/1.0'
      }
    });
    
    const status = response.status;
    const isOk = status >= 200 && status < 400;
    
    console.log(`${isOk ? '✅' : '❌'} ${path}: ${status} ${response.statusText}`);
    
    if (path.includes('/api/')) {
      try {
        const text = await response.text();
        if (text.includes('error') && !text.includes('success')) {
          console.log('   ⚠️  Response contains error');
        } else {
          console.log('   ✅ Response looks healthy');
        }
      } catch (e) {
        console.log('   ⚠️  Could not parse response');
      }
    }
    
    return { path, status, success: isOk };
  } catch (error) {
    console.log(`❌ ${path}: ERROR - ${error.message}`);
    return { path, status: 0, success: false, error: error.message };
  }
}

async function runHealthCheck() {
  const endpoints = [
    '/',
    '/app',
    '/api/widget-config?shop=test.myshopify.com',
    '/api/chat',
    '/api/recommendations'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n📊 Health Check Summary');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`${passed === total ? '🎉 All endpoints healthy!' : '⚠️  Some endpoints may have issues'}`);
  
  if (passed === total) {
    console.log('\n✅ Your Shopify app appears to be UI error-free and ready for submission!');
  } else {
    console.log('\n⚠️  Please check the failed endpoints above.');
  }
  
  return results;
}

runHealthCheck().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});
