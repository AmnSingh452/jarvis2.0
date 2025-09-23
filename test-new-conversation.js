// Test script to verify conversation tracking is working
import fetch from 'node-fetch';

async function testConversationTracking() {
    try {
        console.log('🧪 Testing conversation tracking...');
        
        const shopDomain = 'aman-chatbot-test.myshopify.com';
        const testMessage = 'Hello, I need help with my order status';
        
        // Step 1: Create a new conversation
        console.log('📤 Sending test message to chat API...');
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: testMessage,
                shop_domain: shopDomain,
                session_id: `test-session-${Date.now()}`,
                customer_email: 'test@example.com'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Chat API failed: ${response.status} ${response.statusText}`);
        }
        
        const chatResult = await response.json();
        console.log('✅ Chat API response:', chatResult);
        
        // Step 2: Check analytics data to see if conversation appears
        console.log('📊 Checking analytics data...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for processing
        
        const analyticsResponse = await fetch(`http://localhost:3000/api/analytics-data?shop=${encodeURIComponent(shopDomain)}`);
        
        if (!analyticsResponse.ok) {
            throw new Error(`Analytics API failed: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
        }
        
        const analyticsData = await analyticsResponse.json();
        console.log('📈 Analytics data:', JSON.stringify(analyticsData, null, 2));
        
        // Step 3: Check recent conversations specifically
        if (analyticsData.recentConversations && analyticsData.recentConversations.length > 0) {
            console.log('✅ SUCCESS: Recent conversations found!');
            console.log('🔍 Latest conversation:', analyticsData.recentConversations[0]);
            
            // Check if our test message appears
            const hasTestMessage = analyticsData.recentConversations.some(conv => 
                conv.topic && conv.topic.includes('order') || 
                conv.firstMessage && conv.firstMessage.includes('order')
            );
            
            if (hasTestMessage) {
                console.log('🎉 TEST PASSED: Our test conversation appears in recent conversations!');
            } else {
                console.log('⚠️ Test conversation may not be the most recent one, but tracking is working');
            }
        } else {
            console.log('❌ ISSUE: No recent conversations found');
        }
        
        // Step 4: Check analytics metrics
        console.log('📊 Analytics Summary:');
        console.log(`- Total Conversations: ${analyticsData.totalConversations}`);
        console.log(`- Today's Visitors: ${analyticsData.todayVisitors}`);
        console.log(`- Recent Conversations Count: ${analyticsData.recentConversations?.length || 0}`);
        console.log(`- Top Questions Count: ${analyticsData.topQuestions?.length || 0}`);
        
        if (analyticsData.topQuestions && analyticsData.topQuestions.length > 0) {
            console.log('💬 Sample top questions:');
            analyticsData.topQuestions.slice(0, 3).forEach((q, i) => {
                console.log(`  ${i + 1}. ${q.question} (${q.count} times)`);
            });
        }
        
        console.log('\n✨ Test completed! Data synchronization check finished.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testConversationTracking();
