// Test the proxy endpoint
const fetch = require('node-fetch');

async function testProxy() {
    console.log('🧪 Testing Jarvis Proxy...');
    
    const payload = {
        message: "test",
        shop_domain: "test.myshopify.com", 
        session_id: "test123"
    };
    
    try {
        // Test local development server
        console.log('📡 Testing local dev server...');
        const localResponse = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('🔍 Local response status:', localResponse.status);
        const localData = await localResponse.text();
        console.log('🔍 Local response:', localData);
        
    } catch (localError) {
        console.error('❌ Local test failed:', localError.message);
    }
    
    try {
        // Test production server
        console.log('\n📡 Testing production server...');
        const prodResponse = await fetch('https://jarvis2-0-djg1.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('🔍 Production response status:', prodResponse.status);
        const prodData = await prodResponse.text();
        console.log('🔍 Production response:', prodData);
        
    } catch (prodError) {
        console.error('❌ Production test failed:', prodError.message);
    }
}

testProxy();
