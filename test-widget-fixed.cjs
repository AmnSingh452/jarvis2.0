const https = require('https');

async function testWidgetWithShopDomain() {
  console.log('🎯 Testing widget conversation with proper shop domain...\n');
  
  // Simulate a widget conversation with the shop domain included
  const sessionId = `fixed-session-${Date.now()}`;
  const testMessage = "Can I return items after 30 days?";
  
  console.log(`📱 Testing widget conversation with shop domain`);
  console.log(`💬 Session: ${sessionId}`);
  console.log(`💬 Message: "${testMessage}"`);
  console.log(`🏪 Shop: aman-chatbot-test.myshopify.com`);
  
  // Test the proxy with shop domain in payload (like real widget)
  const chatPayload = JSON.stringify({
    message: testMessage,
    session_id: sessionId,
    shop_domain: "aman-chatbot-test.myshopify.com", // This is what the widget sends
    customer_id: null,
    timestamp: new Date().toISOString()
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jarvis2-0-djg1.onrender.com',
      port: 443,
      path: '/a/jarvis-proxy/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(chatPayload)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ Widget Response (Status: ${res.statusCode}):`);
          console.log(`   Success: ${response.success}`);
          console.log(`   Bot Response: ${response.data?.response?.substring(0, 80)}...`);
          console.log(`   Session ID: ${response.data?.session_id}`);
          
          // Wait for analytics to process
          console.log('\n⏳ Waiting 5 seconds for analytics tracking...');
          setTimeout(async () => {
            await checkFinalAnalytics();
            resolve();
          }, 5000);
          
        } catch (e) {
          console.error('❌ Failed to parse response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(e);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Request failed:', err.message);
      reject(err);
    });
    
    req.write(chatPayload);
    req.end();
  });
}

async function checkFinalAnalytics() {
  console.log('\n📊 Checking final analytics for aman-chatbot-test.myshopify.com...');
  
  return new Promise((resolve) => {
    https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=aman-chatbot-test.myshopify.com&days=30', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const analytics = JSON.parse(data);
          console.log('📈 Final Analytics Results:');
          console.log(`   Total Conversations: ${analytics.overview?.totalConversations || 0}`);
          console.log(`   Response Rate: ${analytics.overview?.responseRate || 0}%`);
          
          console.log(`\n🔥 Top Questions (${analytics.topQuestions?.length || 0}):`);
          if (analytics.topQuestions?.length > 0) {
            analytics.topQuestions.forEach((q, i) => {
              console.log(`   ${i+1}. "${q.question}" (${q.count} times)`);
            });
          }
          
          console.log(`\n💬 Recent Conversations (${analytics.recentConversations?.length || 0}):`);
          if (analytics.recentConversations?.length > 0) {
            analytics.recentConversations.forEach((conv, i) => {
              console.log(`   ${i+1}. ${conv.customer} - ${conv.topic} (${conv.timestamp}) - ${conv.status}`);
            });
          } else {
            console.log('   ❌ No recent conversations found');
          }
          
        } catch (e) {
          console.log('❌ Analytics parse error:', e.message);
          console.log('Raw response:', data.substring(0, 300));
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('❌ Analytics check failed:', err.message);
      resolve();
    });
  });
}

testWidgetWithShopDomain().catch(console.error);
