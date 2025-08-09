/**
 * Manual Webhook Registration Script
 * Run this to ensure the uninstall webhook is properly registered
 */

import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import { config } from 'dotenv';
config({ path: resolve(__dirname, '.env') });

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'write_products'], // Add your scopes here
  hostName: 'jarvis2-0-djg1.onrender.com',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

async function registerWebhook() {
  try {
    console.log('🔧 Webhook Registration Script');
    console.log('================================');
    
    // You'll need to provide a shop domain and access token
    const shop = 'aman-chatbot-test.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE'; // Use environment variable
    
    if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
      console.error('❌ Access token required. Please set SHOPIFY_ACCESS_TOKEN environment variable.');
      console.log('You can get the token from your database or the debug status page.');
      return;
    }
    
    const session = {
      shop,
      accessToken,
    };
    
    const webhook = new shopify.rest.Webhook({ session });
    webhook.topic = 'app/uninstalled';
    webhook.address = 'https://jarvis2-0-djg1.onrender.com/webhooks/app/uninstalled';
    webhook.format = 'json';
    
    await webhook.save({ update: true });
    
    console.log('✅ Webhook registered successfully!');
    console.log('Topic:', webhook.topic);
    console.log('Address:', webhook.address);
    console.log('ID:', webhook.id);
    
    // Verify registration
    const webhooks = await shopify.rest.Webhook.all({ session });
    const uninstallWebhooks = webhooks.data.filter(w => w.topic === 'app/uninstalled');
    
    console.log('\n📋 Current uninstall webhooks:');
    console.log(uninstallWebhooks);
    
  } catch (error) {
    console.error('❌ Error registering webhook:', error.message);
    console.error(error);
  }
}

registerWebhook();
