/**
 * Webhook Testing Utility
 * This script helps debug webhook issues
 */

console.log('🔧 Webhook Environment Check');
console.log('================================');
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT SET');
console.log('SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT SET');
console.log('SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL);
console.log('SHOPIFY_WEBHOOK_SECRET:', process.env.SHOPIFY_WEBHOOK_SECRET ? 'SET' : 'NOT SET');

// Test webhook URL
const webhookUrl = `${process.env.SHOPIFY_APP_URL}/webhooks/app/uninstalled`;
console.log('Expected webhook URL:', webhookUrl);

console.log('\n🔗 Webhook Registration Check');
console.log('================================');
console.log('The webhook should be registered at:', webhookUrl);
console.log('Topic: app/uninstalled');
console.log('Version: 2025-07 (from shopify.app.toml)');

console.log('\n🚨 Common Webhook Issues:');
console.log('================================');
console.log('1. SHOPIFY_WEBHOOK_SECRET not set in production environment');
console.log('2. Webhook URL not accessible (check HTTPS certificate)');
console.log('3. Authentication method mismatch');
console.log('4. API version mismatch between registration and handler');
console.log('5. Request timeout during webhook processing');
