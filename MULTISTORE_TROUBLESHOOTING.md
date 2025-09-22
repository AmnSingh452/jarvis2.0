# Multi-Store Troubleshooting Guide

## Issue: App works on one dev store but not another

### Diagnosis Results:
- ✅ Database shows both stores: `aman-chatbot-test.myshopify.com` (working) and `storeaiagent.myshopify.com` (not working)
- ✅ Both stores have active sessions
- ❌ Widget config times out for `storeaiagent.myshopify.com`
- ✅ App main page loads for both stores

### Root Cause: 
App Bridge/Proxy routing issue for the second store

## Solution Steps:

### 1. Clear and Reinstall App on Problem Store

```bash
# Visit the problem store admin
https://storeaiagent.myshopify.com/admin/apps

# Uninstall Jarvis 2.0 app
# Then reinstall using the development app link
```

### 2. Clear Database Records (if needed)

```bash
# Run this if reinstall doesn't work
cd d:\Jarvis2.0\jarvis2-0
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearStore() {
  const shopDomain = 'storeaiagent.myshopify.com';
  
  await prisma.session.deleteMany({ where: { shop: shopDomain } });
  await prisma.shop.updateMany({ 
    where: { shopDomain }, 
    data: { isActive: false, uninstalledAt: new Date() }
  });
  
  console.log('Cleared data for', shopDomain);
  await prisma.disconnect();
}

clearStore();
"
```

### 3. Check App Installation URL

Make sure you're using the correct installation URL for dev stores:
```
https://storeaiagent.myshopify.com/admin/oauth/install_custom_app?client_id=3ea38032bd55fb833a9f5dfd0ca9d4d0
```

### 4. Verify App Bridge Settings

The app should automatically configure App Bridge, but sometimes dev stores need manual refresh.

### 5. Test Widget Integration

After reinstall, test:
1. App admin access
2. Widget settings page
3. Storefront widget display
4. Analytics functionality

## Prevention:

For future dev stores:
1. Always use fresh installation URLs
2. Clear browser cache between stores
3. Ensure consistent app configuration
4. Test widget proxy routes immediately after install

## Support Commands:

```bash
# Check specific store data
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.shop.findFirst({ where: { shopDomain: 'storeaiagent.myshopify.com' } })
  .then(shop => console.log('Shop data:', shop))
  .finally(() => prisma.disconnect());
"

# Test widget config directly
curl -v "https://storeaiagent.myshopify.com/a/jarvis2-0/widget-config"

# Test app access
curl -v "https://jarvis2-0-djg1.onrender.com/app?shop=storeaiagent.myshopify.com"
```
