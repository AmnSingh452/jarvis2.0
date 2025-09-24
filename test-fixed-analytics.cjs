const https = require('https');

function testFixedAnalytics() {
  console.log('🎯 Testing fixed analytics endpoint...\n');
  
  https.get('https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=aman-chatbot-test.myshopify.com&days=30', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const analytics = JSON.parse(data);
        console.log('📊 Fixed Analytics Results:');
        console.log(`   Total Conversations: ${analytics.overview?.totalConversations || 0}`);
        console.log(`   Unique Visitors: ${analytics.overview?.uniqueVisitors || 0}`);
        console.log(`   Response Rate: ${analytics.overview?.responseRate || 0}%`);
        console.log(`   Conversions: ${analytics.overview?.conversionsGenerated || 0}`);
        console.log(`   Revenue: $${analytics.overview?.revenueGenerated || 0}`);
        
        console.log(`\n🔥 Top Questions Found: ${analytics.topQuestions?.length || 0}`);
        if (analytics.topQuestions?.length > 0) {
          analytics.topQuestions.forEach((q, i) => {
            console.log(`   ${i+1}. "${q.question}" (${q.count} times)`);
          });
        }
        
        console.log(`\n💬 Recent Conversations: ${analytics.recentConversations?.length || 0}`);
        if (analytics.recentConversations?.length > 0) {
          analytics.recentConversations.slice(0, 3).forEach((conv, i) => {
            console.log(`   ${i+1}. ${conv.customer} - ${conv.topic} (${conv.timestamp})`);
          });
        }
        
        console.log(`\n📈 Time Data Entries: ${analytics.timeData?.length || 0}`);
        if (analytics.timeData?.length > 0) {
          console.log('   Recent entries:');
          analytics.timeData.slice(-3).forEach((entry, i) => {
            console.log(`     ${entry.date}: ${entry.conversations} conversations, ${entry.conversions} conversions`);
          });
        }
        
      } catch (e) {
        console.log('❌ Parse error:', e.message);
        console.log('Raw response (first 500 chars):', data.substring(0, 500));
      }
    });
  }).on('error', (err) => {
    console.error('❌ Request error:', err.message);
  });
}

testFixedAnalytics();
