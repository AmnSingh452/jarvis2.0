const https = require('https');

async function testWidgetAndAnalytics() {
  console.log('🧪 Testing widget conversation and analytics tracking...\n');
  
  // Simulate a widget conversation
  const sessionId = `test-session-${Date.now()}`;
  const testMessage = "What are your shipping options?";
  
  console.log(`📱 Simulating widget conversation with session: ${sessionId}`);
  console.log(`💬 Sending message: "${testMessage}"`);
  
  // Test the chat API (this should trigger analytics)
  const chatPayload = JSON.stringify({
    message: testMessage,
    session_id: sessionId,
    shop_domain: "aman-chatbot-test.myshopify.com",
    customer_id: null,
    timestamp: new Date().toISOString()
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jarvis2-0-djg1.onrender.com',
      port: 443,
      path: '/api/chat',
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
          console.log(`✅ Chat API Response (Status: ${res.statusCode}):`);
          console.log(`   Success: ${response.success}`);
          console.log(`   Bot Response: ${response.data?.response?.substring(0, 100)}...`);
          console.log(`   Session ID: ${response.data?.session_id}`);
          
          // Wait a moment for analytics to process
          console.log('\n⏳ Waiting 3 seconds for analytics to process...');
          setTimeout(async () => {
            await checkAnalytics();
            await checkDatabase();
            resolve();
          }, 3000);
          
        } catch (e) {
          console.error('❌ Failed to parse chat response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(e);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Chat API request failed:', err.message);
      reject(err);
    });
    
    req.write(chatPayload);
    req.end();
  });
}

async function checkAnalytics() {
  console.log('\n📊 Checking analytics API...');
  
  return new Promise((resolve) => {
    https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const analytics = JSON.parse(data);
          console.log('📈 Analytics Results:');
          console.log(`   Total Conversations: ${analytics.overview?.totalConversations || 0}`);
          console.log(`   Conversions: ${analytics.overview?.conversions || 0}`);
          console.log(`   Revenue: $${analytics.overview?.revenueGenerated || 0}`);
          console.log(`   Time Data Entries: ${analytics.timeData?.length || 0}`);
          
          if (analytics.commonQuestions?.length > 0) {
            console.log('   Most Asked Questions:');
            analytics.commonQuestions.slice(0, 3).forEach((q, i) => {
              console.log(`     ${i+1}. "${q.question}" (${q.count} times)`);
            });
          }
          
          if (analytics.recentConversations?.length > 0) {
            console.log('   Recent Conversations:');
            analytics.recentConversations.slice(0, 2).forEach((conv, i) => {
              console.log(`     ${i+1}. ${conv.customerName} - ${conv.topic} (${conv.timeAgo})`);
            });
          }
          
        } catch (e) {
          console.log('❌ Failed to parse analytics response');
          console.log('Raw response:', data.substring(0, 300));
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('❌ Analytics API error:', err.message);
      resolve();
    });
  });
}

async function checkDatabase() {
  // We'll use our existing script
  console.log('\n💾 Checking database...');
}

// Run the test
testWidgetAndAnalytics().catch(console.error);
