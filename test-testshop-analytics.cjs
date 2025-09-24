const https = require('https');

function testTestShopAnalytics() {
  console.log('🔍 Checking analytics for test-shop domain...\n');
  
  https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=test-shop&days=30', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const analytics = JSON.parse(data);
        console.log('📊 test-shop Analytics:');
        console.log(`   Total Conversations: ${analytics.overview?.totalConversations || 0}`);
        console.log(`   Questions Found: ${analytics.topQuestions?.length || 0}`);
        
        if (analytics.topQuestions?.length > 0) {
          console.log('   Top Questions:');
          analytics.topQuestions.forEach((q, i) => {
            console.log(`     ${i+1}. "${q.question}" (${q.count} times)`);
          });
        }
        
        console.log(`   Recent Conversations: ${analytics.recentConversations?.length || 0}`);
        if (analytics.recentConversations?.length > 0) {
          analytics.recentConversations.forEach((conv, i) => {
            console.log(`     ${i+1}. ${conv.customer} - ${conv.topic} (${conv.timestamp})`);
          });
        }
        
      } catch (e) {
        console.log('❌ Parse error:', e.message);
        console.log('Raw response:', data.substring(0, 300));
      }
    });
  }).on('error', (err) => {
    console.error('❌ Request error:', err.message);
  });
}

testTestShopAnalytics();
