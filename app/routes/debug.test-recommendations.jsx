import { json } from "@remix-run/node";

export async function loader() {
  return json({
    message: "Test Recommendations API",
    endpoint: "/api/recommendations",
    methods: ["POST"],
    testCases: [
      "Normal request",
      "Cached response test",
      "Rate limiting simulation",
      "Error handling"
    ]
  });
}

export default function TestRecommendations() {
  const buttonStyle = {
    margin: "5px",
    padding: "10px 15px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>🔍 Recommendations API Testing</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>Test Cases:</h2>
        <button onClick={() => testNormalRequest()} style={buttonStyle}>
          1. Test Normal Request
        </button>
        <button onClick={() => testCacheHit()} style={buttonStyle}>
          2. Test Cache Hit
        </button>
        <button onClick={() => testMultipleRequests()} style={buttonStyle}>
          3. Test Multiple Requests (Cache Performance)
        </button>
        <button onClick={() => testErrorHandling()} style={buttonStyle}>
          4. Test Error Handling
        </button>
      </div>

      <div id="test-results" style={{ 
        backgroundColor: "#f5f5f5", 
        padding: "15px", 
        borderRadius: "5px",
        minHeight: "200px",
        whiteSpace: "pre-wrap"
      }}>
        Test results will appear here...
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        function log(message) {
          const results = document.getElementById('test-results');
          results.textContent += new Date().toISOString() + ': ' + message + '\\n';
        }

        async function testNormalRequest() {
          log('🧪 Testing normal request...');
          try {
            const start = performance.now();
            const response = await fetch('/api/recommendations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shop_domain: 'test.myshopify.com',
                product_ids: [8001, 8002],
                customer_id: null
              })
            });
            
            const end = performance.now();
            const data = await response.json();
            const cacheStatus = response.headers.get('X-Cache') || 'UNKNOWN';
            
            log(\`✅ Response time: \${Math.round(end - start)}ms\`);
            log(\`📋 Cache status: \${cacheStatus}\`);
            log(\`🎯 Status: \${response.status}\`);
            log(\`📊 Products found: \${data.recommendations?.length || 0}\`);
            
          } catch (error) {
            log(\`❌ Error: \${error.message}\`);
          }
        }

        async function testCacheHit() {
          log('\\n🧪 Testing cache hit (same request twice)...');
          const payload = {
            shop_domain: 'test.myshopify.com',
            product_ids: [8003, 8004],
            customer_id: 'test123'
          };

          // First request
          log('📡 Making first request...');
          const start1 = performance.now();
          const response1 = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const end1 = performance.now();
          const cache1 = response1.headers.get('X-Cache');
          
          log(\`⏱️  First request: \${Math.round(end1 - start1)}ms (Cache: \${cache1})\`);

          // Second request (should be cached)
          await new Promise(resolve => setTimeout(resolve, 100));
          log('📡 Making second request (should be cached)...');
          const start2 = performance.now();
          const response2 = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const end2 = performance.now();
          const cache2 = response2.headers.get('X-Cache');
          
          log(\`⚡ Second request: \${Math.round(end2 - start2)}ms (Cache: \${cache2})\`);
          
          if (cache2 === 'HIT' && (end2 - start2) < (end1 - start1)) {
            log('✅ Cache is working! Second request was faster.');
          } else {
            log('⚠️  Cache might not be working as expected.');
          }
        }

        async function testMultipleRequests() {
          log('\\n🧪 Testing multiple concurrent requests...');
          const requests = [];
          
          for (let i = 0; i < 5; i++) {
            requests.push(
              fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shop_domain: 'concurrent-test.myshopify.com',
                  product_ids: [8001 + i],
                  customer_id: \`concurrent-\${i}\`
                })
              })
            );
          }
          
          const start = performance.now();
          const responses = await Promise.all(requests);
          const end = performance.now();
          
          log(\`🚀 5 concurrent requests completed in \${Math.round(end - start)}ms\`);
          
          let cacheHits = 0;
          for (let i = 0; i < responses.length; i++) {
            const cacheStatus = responses[i].headers.get('X-Cache');
            log(\`📡 Request \${i + 1}: \${responses[i].status} (Cache: \${cacheStatus})\`);
            if (cacheStatus === 'HIT') cacheHits++;
          }
          
          log(\`📊 Cache hits: \${cacheHits}/5\`);
        }

        async function testErrorHandling() {
          log('\\n🧪 Testing error handling with invalid data...');
          try {
            const response = await fetch('/api/recommendations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: 'invalid json'
            });
            
            const data = await response.text();
            log(\`🎯 Status: \${response.status}\`);
            log(\`📄 Response: \${data.substring(0, 200)}...\`);
            
            if (response.status >= 400) {
              log('✅ Error handling is working correctly.');
            }
            
          } catch (error) {
            log(\`❌ Unexpected error: \${error.message}\`);
          }
        }
      `}} />

      <style dangerouslySetInnerHTML={{__html: `
        button {
          margin: 5px;
          padding: 10px 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        button:hover {
          background-color: #0056b3;
        }
      `}} />
    </div>
  );
}
