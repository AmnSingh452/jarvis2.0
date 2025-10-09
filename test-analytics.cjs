const https = require('https');

const testAnalyticsAPI = () => {
  const options = {
    hostname: 'jarvis2-0.onrender.com',
    port: 443,
    path: '/api/analytics-data?shop=quickstart-d52b80a8.myshopify.com&days=30',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('\n=== ANALYTICS API RESPONSE ===');
        console.log('Overview:', JSON.stringify(result.overview, null, 2));
        console.log('\nPlan Usage:', JSON.stringify(result.planUsage, null, 2));
        console.log('\nRecent Conversations:', JSON.stringify(result.recentConversations, null, 2));
        console.log('\nShop Domain:', result.shopDomain);
      } catch (e) {
        console.log('Raw response:', data);
        console.log('Parse error:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
};

testAnalyticsAPI();