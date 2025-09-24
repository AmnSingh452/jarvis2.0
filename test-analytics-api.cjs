const https = require('https');

function testAnalyticsAPI() {
  const url = 'https://jarvis2-0-djg1.onrender.com/api/analytics-data';
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Analytics API Response:');
        console.log('Total Conversations:', parsed.overview?.totalConversations || 0);
        console.log('Conversions:', parsed.overview?.conversions || 0);
        console.log('Revenue:', parsed.overview?.revenueGenerated || 0);
        console.log('Time Data Length:', parsed.timeData?.length || 0);
        
        if (parsed.timeData && parsed.timeData.length > 0) {
          console.log('Recent entries:');
          parsed.timeData.slice(0, 3).forEach((entry, i) => {
            console.log(`  ${i+1}. ${entry.date}: ${entry.conversations} conversations, ${entry.conversions} conversions, $${entry.revenue} revenue`);
          });
        }
      } catch (e) {
        console.log('Response (first 500 chars):', data.substring(0, 500));
      }
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

testAnalyticsAPI();
