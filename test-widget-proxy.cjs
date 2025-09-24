const https = require('https');

async function testWidgetProxy() {
  console.log('🎯 Testing widget conversation through Shopify App Proxy...\n');
  
  // Simulate a widget conversation through the proxy
  const sessionId = `widget-session-${Date.now()}`;
  const testMessage = "Do you offer free returns?";
  
  console.log(`📱 Simulating widget conversation through proxy`);
  console.log(`💬 Session: ${sessionId}`);
  console.log(`💬 Message: "${testMessage}"`);
  
  // Test the proxy chat endpoint (this is what the widget actually calls)
  const chatPayload = JSON.stringify({
    message: testMessage,
    session_id: sessionId,
    customer_id: null,
    timestamp: new Date().toISOString()
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jarvis2-0-djg1.onrender.com',
      port: 443,
      path: '/a/jarvis-proxy/chat',  // This is the actual widget proxy endpoint
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
          console.log(`✅ Proxy Chat Response (Status: ${res.statusCode}):`);
          console.log(`   Success: ${response.success}`);
          console.log(`   Bot Response: ${response.data?.response?.substring(0, 100)}...`);
          console.log(`   Session ID: ${response.data?.session_id}`);
          
          // Wait for analytics to process
          console.log('\n⏳ Waiting 5 seconds for analytics tracking...');
          setTimeout(async () => {
            await checkAnalyticsAfterWidget();
            resolve();
          }, 5000);
          
        } catch (e) {
          console.error('❌ Failed to parse proxy response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(e);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Proxy request failed:', err.message);
      reject(err);
    });
    
    req.write(chatPayload);
    req.end();
  });
}

async function checkAnalyticsAfterWidget() {
  console.log('\n📊 Checking analytics after widget test...');
  
  return new Promise((resolve) => {
    https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=aman-chatbot-test.myshopify.com&days=30', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const analytics = JSON.parse(data);
          console.log('📈 Updated Analytics:');
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
            analytics.recentConversations.slice(0, 3).forEach((conv, i) => {
              console.log(`   ${i+1}. ${conv.customer} - ${conv.topic} (${conv.timestamp})`);
            });
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

testWidgetProxy().catch(console.error);
