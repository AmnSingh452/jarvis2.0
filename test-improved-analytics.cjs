const https = require('https');

async function testImprovedAnalytics() {
  console.log('🎯 Testing improved analytics after fixes...\n');
  
  // Test with a new conversation
  const sessionId = `improved-session-${Date.now()}`;
  const testMessage = "How long does shipping take?";
  
  console.log(`📱 Testing improved analytics tracking`);
  console.log(`💬 Session: ${sessionId}`);
  console.log(`💬 Message: "${testMessage}"`);
  
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
          console.log(`✅ Chat Response (Status: ${res.statusCode}):`);
          console.log(`   Success: ${response.success}`);
          console.log(`   Session ID: ${response.data?.session_id}`);
          
          // Wait for analytics to process
          console.log('\n⏳ Waiting 8 seconds for analytics processing...');
          setTimeout(async () => {
            await checkImprovedAnalytics();
            resolve();
          }, 8000);
          
        } catch (e) {
          console.error('❌ Failed to parse response:', e.message);
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

async function checkImprovedAnalytics() {
  console.log('\n📊 Checking improved analytics...');
  
  return new Promise((resolve) => {
    https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=aman-chatbot-test.myshopify.com&days=30', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const analytics = JSON.parse(data);
          console.log('📈 Improved Analytics Results:');
          console.log('   📊 OVERVIEW METRICS:');
          console.log(`      Total Conversations: ${analytics.overview?.totalConversations || 0}`);
          console.log(`      Unique Visitors: ${analytics.overview?.uniqueVisitors || 0}`);
          console.log(`      Response Rate: ${analytics.overview?.responseRate || 0}%`);
          console.log(`      Avg Response Time: ${analytics.overview?.avgResponseTime || 0}`);
          console.log(`      Customer Satisfaction: ${analytics.overview?.customerSatisfaction || 0}/5`);
          console.log(`      Conversions: ${analytics.overview?.conversionsGenerated || 0}`);
          console.log(`      Revenue: $${analytics.overview?.revenueGenerated || 0}`);
          
          console.log(`\n   🔥 TOP QUESTIONS (${analytics.topQuestions?.length || 0}):`);
          if (analytics.topQuestions?.length > 0) {
            analytics.topQuestions.forEach((q, i) => {
              console.log(`      ${i+1}. "${q.question}" (${q.count} times)`);
            });
          }
          
          console.log(`\n   💬 RECENT CONVERSATIONS (${analytics.recentConversations?.length || 0}):`);
          if (analytics.recentConversations?.length > 0) {
            analytics.recentConversations.forEach((conv, i) => {
              console.log(`      ${i+1}. ${conv.customer} - ${conv.topic} (${conv.timestamp}) - ${conv.status}`);
            });
          } else {
            console.log('      ❌ No recent conversations found');
          }
          
          // Summary
          console.log('\n🎯 SUMMARY:');
          const hasRealistic = analytics.overview?.responseRate !== 'Infinity%' && 
                              analytics.overview?.avgResponseTime !== '0.0s';
          console.log(`   ✅ Fixed Response Rate: ${hasRealistic ? 'YES' : 'NO'}`);
          console.log(`   ✅ Shows All Conversations: ${analytics.recentConversations?.length >= 3 ? 'YES' : 'PARTIAL'}`);
          
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

// Wait for deployment then test
setTimeout(() => {
  testImprovedAnalytics().catch(console.error);
}, 15000); // Wait 15 seconds for deployment

console.log('⏳ Waiting for deployment to complete...');
