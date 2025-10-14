const https = require('https');

const testAnalyticsAPI = async () => {
  console.log("🧪 Testing Analytics API - Average Session Duration");
  console.log("================================================");
  
  const options = {
    hostname: 'jarvis2-0.onrender.com',
    port: 443,
    path: '/api/analytics-data?shop=quickstart-d52b80a8.myshopify.com&days=30',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000 // 30 second timeout
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`📡 Response Status: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            console.log("\n✅ Analytics API Response Received");
            console.log("=====================================");
            
            // Check average session duration specifically
            if (result.overview) {
              console.log("📊 Overview Data:");
              console.log(`   Total Conversations: ${result.overview.totalConversations || 'N/A'}`);
              console.log(`   Active Sessions: ${result.overview.activeSessions || 'N/A'}`);
              console.log(`   📏 Avg Session Duration: ${result.overview.avgSessionDuration || 'N/A'}m`);
              console.log(`   Messages Per Session: ${result.overview.messagesPerSession || 'N/A'}`);
              
              // Test if session duration is working
              const avgDuration = parseFloat(result.overview.avgSessionDuration);
              console.log("\n🔍 Session Duration Analysis:");
              if (avgDuration > 0) {
                console.log(`   ✅ WORKING: Average session duration is ${avgDuration} minutes`);
                console.log(`   📈 Status: ${avgDuration > 3 ? 'High engagement' : 'Normal engagement'}`);
              } else {
                console.log("   ⚠️  ISSUE: Average session duration is 0 or missing");
                console.log("   🔍 Possible causes:");
                console.log("      - No completed conversations with endTime");
                console.log("      - All conversations are still active");
                console.log("      - Database connection issues");
              }
            } else {
              console.log("❌ No overview data in response");
            }

            // Check recent conversations
            if (result.recentConversations) {
              console.log(`\n💬 Recent Conversations: ${result.recentConversations.length} found`);
              result.recentConversations.slice(0, 3).forEach((conv, index) => {
                console.log(`   ${index + 1}. ${conv.customer} - ${conv.status} - ${conv.timestamp}`);
              });
            }

            resolve(result);
          } else {
            console.log(`❌ HTTP Error: ${res.statusCode}`);
            console.log(`Response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          console.log("❌ JSON Parse Error:", e.message);
          console.log("Raw response:", data.substring(0, 500));
          reject(e);
        }
      });
    });

    req.on('timeout', () => {
      console.log("⏰ Request timed out after 30 seconds");
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (e) => {
      console.log(`🚨 Request Error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
};

// Run the test
testAnalyticsAPI()
  .then((result) => {
    console.log("\n🎉 Test completed successfully!");
  })
  .catch((error) => {
    console.log("\n💥 Test failed:", error.message);
  });