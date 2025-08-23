// Simple Node.js test to debug the request
import https from 'https';

const payload = JSON.stringify({
    message: "hello",
    shop_domain: "test.myshopify.com", 
    session_id: "test123"
});

console.log('🧪 Testing with payload:', payload);
console.log('📏 Payload length:', payload.length);

const options = {
    hostname: 'jarvis2-0-djg1.onrender.com',
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'User-Agent': 'Node.js-Test/1.0'
    }
};

const req = https.request(options, (res) => {
    console.log('📊 Status:', res.statusCode);
    console.log('📋 Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('📦 Response:', data);
        try {
            const jsonResponse = JSON.parse(data);
            console.log('✅ Parsed response:', JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
            console.log('❌ Could not parse response as JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.write(payload);
req.end();
