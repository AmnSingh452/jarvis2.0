const https = require('https');

async function testAnalyticsEndpoint() {
  console.log('🔍 Testing analytics-event endpoint directly...\n');
  
  // Test different event types
  const testEvents = [
    {
      eventType: 'conversation_start',
      shopDomain: 'aman-chatbot-test.myshopify.com',
      sessionId: 'test-session-direct',
      data: {}
    },
    {
      eventType: 'question',
      shopDomain: 'aman-chatbot-test.myshopify.com',
      sessionId: 'test-session-direct',
      data: { question: 'What are your shipping options?' }
    },
    {
      eventType: 'message',
      shopDomain: 'aman-chatbot-test.myshopify.com',
      sessionId: 'test-session-direct',
      data: { messageLength: 29 }
    }
  ];
  
  for (const event of testEvents) {
    console.log(`📤 Testing ${event.eventType} event...`);
    
    const payload = JSON.stringify(event);
    
    const options = {
      hostname: 'jarvis2-0-djg1.onrender.com',
      port: 443,
      path: '/api/analytics-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`   ✅ Status: ${res.statusCode}`);
            console.log(`   📝 Response: ${response.message || response.error}`);
            console.log(`   🎯 Success: ${response.success}`);
          } catch (e) {
            console.log(`   ❌ Parse error: ${e.message}`);
            console.log(`   📄 Raw response: ${data.substring(0, 200)}`);
          }
          resolve();
        });
      });
      
      req.on('error', (err) => {
        console.log(`   ❌ Request error: ${err.message}`);
        resolve();
      });
      
      req.write(payload);
      req.end();
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Check analytics after all events
  console.log('\n⏳ Waiting 2 seconds then checking analytics...');
  setTimeout(checkAnalyticsAfterTest, 2000);
}

function checkAnalyticsAfterTest() {
  console.log('\n📊 Checking analytics after direct event tests...');
  
  https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const analytics = JSON.parse(data);
        console.log('📈 Final Analytics Results:');
        console.log(`   Total Conversations: ${analytics.overview?.totalConversations || 0}`);
        console.log(`   Total Messages: ${analytics.overview?.totalMessages || 0}`);
        console.log(`   Time Data Entries: ${analytics.timeData?.length || 0}`);
        
        if (analytics.commonQuestions?.length > 0) {
          console.log('   Questions Found:');
          analytics.commonQuestions.forEach((q, i) => {
            console.log(`     ${i+1}. "${q.question}" (${q.count} times)`);
          });
        } else {
          console.log('   ❌ No questions found in analytics');
        }
        
      } catch (e) {
        console.log('❌ Failed to parse analytics response');
        console.log('Raw response:', data.substring(0, 300));
      }
    });
  }).on('error', (err) => {
    console.error('❌ Analytics check failed:', err.message);
  });
}

testAnalyticsEndpoint().catch(console.error);
