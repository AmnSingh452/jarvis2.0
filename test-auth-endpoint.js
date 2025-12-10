/**
 * Test the auth endpoint to see what's happening
 */

const TEST_URL = 'https://jarvis2-0-djg1.onrender.com/auth?shop=aman-chatbot-test.myshopify.com&ref=DIGITAL2025';

async function testAuthEndpoint() {
  console.log('🧪 Testing Auth Endpoint\n');
  console.log('URL:', TEST_URL, '\n');
  
  try {
    const response = await fetch(TEST_URL, {
      redirect: 'manual' // Don't follow redirects, we want to see them
    });
    
    console.log('📊 Response Details:');
    console.log('Status:', response.status, response.statusText);
    console.log('Type:', response.type);
    console.log('\n📋 Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const contentType = response.headers.get('content-type');
    
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      console.log('\n✅ REDIRECT DETECTED!');
      console.log('Redirecting to:', location);
      console.log('\n💡 This is correct! OAuth flow is working.');
      
      if (location && location.includes('myshopify.com')) {
        console.log('✅ Redirecting to Shopify OAuth - PERFECT!');
      }
    } else if (response.status === 500) {
      console.log('\n❌ SERVER ERROR (500)');
      const text = await response.text();
      console.log('\nResponse body:', text.substring(0, 500));
      console.log('\n💡 Check Render deployment logs for the error');
    } else if (response.status === 200) {
      console.log('\n⚠️  Status 200 (should be redirect)');
      const text = await response.text();
      console.log('\nResponse preview:', text.substring(0, 200));
      
      if (!text || text.trim() === '') {
        console.log('\n❌ BLANK PAGE - Response is empty');
        console.log('💡 This means the route is not returning anything');
      }
    } else {
      console.log('\n⚠️  Unexpected status:', response.status);
      const text = await response.text();
      console.log('Response:', text.substring(0, 500));
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.error('Error type:', error.name);
  }
}

testAuthEndpoint();
