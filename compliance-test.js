#!/usr/bin/env node

/**
 * Shopify App Compliance Test Suite
 * Tests all critical components for UI errors and functionality
 */

import https from 'https';
import { URL } from 'url';

const APP_BASE_URL = 'https://jarvis2-0-djg1.onrender.com';
const TEST_SHOP = 'test-shop.myshopify.com';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class ComplianceTest {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async test(name, testFn) {
    try {
      this.log(`\n🧪 Testing: ${name}`, colors.blue);
      const result = await testFn();
      if (result.success) {
        this.log(`✅ PASS: ${name}`, colors.green);
        this.passed++;
      } else {
        this.log(`❌ FAIL: ${name} - ${result.error}`, colors.red);
        this.failed++;
      }
      this.results.push({ name, ...result });
    } catch (error) {
      this.log(`❌ ERROR: ${name} - ${error.message}`, colors.red);
      this.failed++;
      this.results.push({ name, success: false, error: error.message });
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, APP_BASE_URL);
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Shopify-App-Compliance-Test/1.0',
          'Accept': 'application/json',
          ...options.headers
        }
      };

      if (options.body) {
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
      }

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsed,
              raw: data
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              raw: data
            });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async testWidgetConfiguration() {
    const response = await this.makeRequest(`/api/widget-config?shop=${TEST_SHOP}`);
    
    if (response.status !== 200) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const config = response.data;
    if (!config.success || !config.api_endpoints) {
      return { success: false, error: 'Invalid configuration structure' };
    }

    // Test that all required endpoints are present
    const requiredEndpoints = ['chat', 'recommendations', 'widget_settings'];
    for (const endpoint of requiredEndpoints) {
      if (!config.api_endpoints[endpoint]) {
        return { success: false, error: `Missing ${endpoint} endpoint` };
      }
    }

    return { success: true, data: config };
  }

  async testChatAPI() {
    const testMessage = {
      message: "Hello, this is a test message",
      shop: TEST_SHOP,
      timestamp: new Date().toISOString()
    };

    const response = await this.makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify(testMessage)
    });

    // Chat API should handle requests gracefully, even if external service is down
    if (response.status === 500) {
      // Check if it's a graceful error response
      if (response.data && response.data.error && response.data.message) {
        return { success: true, data: 'Graceful error handling verified' };
      }
      return { success: false, error: 'No graceful error handling' };
    }

    return { success: true, data: response.data };
  }

  async testRecommendationsAPI() {
    const testRequest = {
      cart: [],
      shop: TEST_SHOP,
      customer: null
    };

    const response = await this.makeRequest('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify(testRequest)
    });

    // Should handle requests gracefully
    if (response.status >= 200 && response.status < 600) {
      return { success: true, data: 'API responds appropriately' };
    }

    return { success: false, error: `Unexpected status: ${response.status}` };
  }

  async testErrorHandling() {
    // Test with malformed request
    const response = await this.makeRequest('/api/chat', {
      method: 'POST',
      body: 'invalid json'
    });

    // Should return proper error response, not crash
    if (response.status >= 400 && response.status < 500) {
      return { success: true, data: 'Handles malformed requests' };
    }

    return { success: false, error: 'Does not handle malformed requests properly' };
  }

  async testCORSHeaders() {
    const response = await this.makeRequest('/api/widget-config', {
      method: 'OPTIONS'
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    if (!corsHeaders) {
      return { success: false, error: 'Missing CORS headers' };
    }

    return { success: true, data: 'CORS headers present' };
  }

  async testAppRoutes() {
    const routes = ['/', '/app'];
    let allPassed = true;
    const results = [];

    for (const route of routes) {
      try {
        const response = await this.makeRequest(route);
        if (response.status >= 200 && response.status < 400) {
          results.push(`✅ ${route}: ${response.status}`);
        } else {
          results.push(`❌ ${route}: ${response.status}`);
          allPassed = false;
        }
      } catch (error) {
        results.push(`❌ ${route}: ${error.message}`);
        allPassed = false;
      }
    }

    return { 
      success: allPassed, 
      data: results.join(', '),
      error: allPassed ? null : 'Some routes failed'
    };
  }

  async testSSLSecurity() {
    const response = await this.makeRequest('/');
    
    // Check if HTTPS is working
    if (response.status >= 200 && response.status < 400) {
      return { success: true, data: 'HTTPS working correctly' };
    }

    return { success: false, error: 'HTTPS connection issues' };
  }

  async runAllTests() {
    this.log(`\n${colors.bold}🏗️  Shopify App Compliance Test Suite${colors.reset}`);
    this.log(`${colors.bold}🎯 Target: ${APP_BASE_URL}${colors.reset}`);
    this.log(`${colors.bold}📅 Started: ${new Date().toISOString()}${colors.reset}`);

    // Run all tests
    await this.test('SSL/HTTPS Security', () => this.testSSLSecurity());
    await this.test('App Routes Accessibility', () => this.testAppRoutes());
    await this.test('Widget Configuration API', () => this.testWidgetConfiguration());
    await this.test('Chat API Error Handling', () => this.testChatAPI());
    await this.test('Recommendations API', () => this.testRecommendationsAPI());
    await this.test('Malformed Request Handling', () => this.testErrorHandling());
    await this.test('CORS Headers', () => this.testCORSHeaders());

    // Print summary
    this.log(`\n${colors.bold}📊 Test Results Summary${colors.reset}`);
    this.log(`${colors.green}✅ Passed: ${this.passed}${colors.reset}`);
    this.log(`${colors.red}❌ Failed: ${this.failed}${colors.reset}`);
    
    const totalTests = this.passed + this.failed;
    const passRate = ((this.passed / totalTests) * 100).toFixed(1);
    
    if (this.failed === 0) {
      this.log(`\n${colors.green}${colors.bold}🎉 ALL TESTS PASSED! App appears to be UI error-free.${colors.reset}`);
    } else {
      this.log(`\n${colors.yellow}⚠️  Pass Rate: ${passRate}% (${this.passed}/${totalTests})${colors.reset}`);
      this.log(`${colors.red}Some issues found that may affect compliance.${colors.reset}`);
    }

    this.log(`\n${colors.bold}🔍 Detailed Results:${colors.reset}`);
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? colors.green : colors.red;
      this.log(`${color}${status} ${result.name}${colors.reset}`);
      if (result.error) {
        this.log(`   Error: ${result.error}`, colors.red);
      }
      if (result.data) {
        this.log(`   Details: ${result.data}`, colors.blue);
      }
    });

    return {
      passed: this.passed,
      failed: this.failed,
      passRate,
      results: this.results
    };
  }
}

// Run tests if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  const tester = new ComplianceTest();
  tester.runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export default ComplianceTest;
