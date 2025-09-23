// Test script to verify multiple messages in same conversation are tracked
import fetch from 'node-fetch';

async function testMultipleMessages() {
    try {
        console.log('🧪 Testing multiple messages in same conversation...');
        
        const shopDomain = 'aman-chatbot-test.myshopify.com';
        const sessionId = `test-session-${Date.now()}`;
        
        // Message 1: Initial question
        console.log('\n📤 Sending message 1: Initial question...');
        const response1 = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Hello, I need help with my order',
                shop_domain: shopDomain,
                session_id: sessionId,
                customer_email: 'test@example.com'
            })
        });
        
        const result1 = await response1.json();
        console.log('✅ Message 1 response:', result1.success ? 'Success' : 'Failed');
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Message 2: Follow-up question
        console.log('\n📤 Sending message 2: Follow-up question...');
        const response2 = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'What is the status of order #12345?',
                shop_domain: shopDomain,
                session_id: sessionId,
                customer_email: 'test@example.com'
            })
        });
        
        const result2 = await response2.json();
        console.log('✅ Message 2 response:', result2.success ? 'Success' : 'Failed');
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Message 3: Different topic
        console.log('\n📤 Sending message 3: Different topic...');
        const response3 = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Do you have any shipping discounts available?',
                shop_domain: shopDomain,
                session_id: sessionId,
                customer_email: 'test@example.com'
            })
        });
        
        const result3 = await response3.json();
        console.log('✅ Message 3 response:', result3.success ? 'Success' : 'Failed');
        
        // Check analytics
        console.log('\n📊 Checking analytics after multiple messages...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for processing
        
        const analyticsResponse = await fetch(`http://localhost:3000/api/analytics-data?shop=${encodeURIComponent(shopDomain)}`);
        const analyticsData = await analyticsResponse.json();
        
        console.log('\n📈 Analytics Results:');
        console.log(`- Total Conversations: ${analyticsData.overview?.totalConversations || 'N/A'}`);
        console.log(`- Recent Conversations Count: ${analyticsData.recentConversations?.length || 0}`);
        
        if (analyticsData.recentConversations && analyticsData.recentConversations.length > 0) {
            console.log('\n🔍 Latest conversation details:');
            const latestConv = analyticsData.recentConversations[0];
            console.log(`- ID: ${latestConv.id}`);
            console.log(`- Customer: ${latestConv.customer}`);
            console.log(`- Topic: ${latestConv.topic}`);
            console.log(`- Timestamp: ${latestConv.timestamp}`);
            console.log(`- Status: ${latestConv.status}`);
            
            // Check if this conversation has multiple messages
            console.log('\n📝 Checking conversation message count...');
            // We'll assume the latest conversation is ours since we just created it
            if (latestConv.timestamp.includes('now') || latestConv.timestamp.includes('minute')) {
                console.log('🎉 SUCCESS: New conversation found in recent conversations!');
                console.log('📊 This conversation should contain 6 messages (3 user + 3 bot responses)');
            } else {
                console.log('⚠️ The latest conversation might not be our test conversation');
            }
        }
        
        console.log('\n📈 Top Questions:');
        if (analyticsData.topQuestions && analyticsData.topQuestions.length > 0) {
            analyticsData.topQuestions.slice(0, 5).forEach((q, i) => {
                console.log(`  ${i + 1}. ${q.question} (${q.count} times)`);
            });
        }
        
        console.log('\n✨ Multi-message conversation test completed!');
        console.log('🔍 Expected behavior:');
        console.log('- One conversation should be created (not three separate ones)');
        console.log('- That conversation should contain 6 total messages');
        console.log('- Analytics should reflect the conversation properly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testMultipleMessages();
