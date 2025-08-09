# Testing Shopify Managed Pricing Integration

## 🧪 Development Testing Guide

### Prerequisites
- Development server running (`npm run dev` or `shopify app dev`)
- Access to your development store: `aman-chatbot-test.myshopify.com`
- App installed in development store

## 📋 Test Plan

### 1. **Test Billing Page (app.billing_v2)**
**URL**: `/app/billing_v2`

**Expected Behavior**:
- Shows two plan cards (Essential Chat $14.99, Sales Pro $39.99)
- Blue banner explaining Shopify managed billing
- Both plan buttons should redirect to Shopify's pricing page

**Test URLs Generated**:
- Store Handle: `aman-chatbot-test`
- Pricing Plans: `https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0/pricing_plans`
- Billing Management: `https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0`

### 2. **Test Direct Redirect (billing.redirect)**
**URL**: `/billing/redirect`

**Expected Behavior**:
- Immediately redirects to Shopify's pricing plans page
- No UI shown, just redirect

### 3. **Test Billing Test Component (app.billing-test)**
**URL**: `/app/billing-test`

**Expected Behavior**:
- Shows form to enter store handle
- Test buttons to verify URL generation
- Console logs showing generated URLs

## 🔍 What to Check

### 1. **URL Generation**
Verify the generated URLs match this pattern:
```
https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0/pricing_plans
https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0
```

### 2. **Button Functionality**
- "Select Essential Chat" button works
- "Select Sales Pro" button works
- "Manage Plans" button works
- "Contact Billing Support" button works

### 3. **Data Loading**
- Store domain detected correctly
- Store handle extracted properly (removes .myshopify.com)
- App handle set to `jarvis2-0`

### 4. **Shopify Redirection**
- Redirects open in new tab/window
- URLs lead to Shopify admin (may show "page not found" until pricing is set up)

## 🚨 Expected Issues (Normal in Development)

### 1. **"Page Not Found" on Shopify**
- **Why**: Managed pricing plans not yet configured in Partners dashboard
- **Status**: Normal - will work once plans are set up
- **Test**: URL structure should be correct

### 2. **Authentication Errors**
- **Why**: Development store permissions
- **Fix**: Ensure app is properly installed

### 3. **Redirect Issues**
- **Why**: Browser popup blockers
- **Fix**: Allow popups for your development URL

## 🎯 Test Steps

### Step 1: Basic Billing Page Test
1. Navigate to your development app
2. Go to `/app/billing_v2`
3. Verify page loads with both plan cards
4. Check console for any errors

### Step 2: URL Generation Test
1. Go to `/app/billing-test`
2. Enter "aman-chatbot-test" as store handle
3. Click "Test Pricing Plans Page"
4. Check console output for correct URL

### Step 3: Button Click Test
1. Back to `/app/billing_v2`
2. Click "Select Essential Chat"
3. Should redirect to: `https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0/pricing_plans`
4. URL should be correct (may show 404 until pricing configured)

### Step 4: Store Handle Detection Test
1. Check the billing page shows correct store info
2. Should display: "Store: aman-chatbot-test.myshopify.com"
3. Should display: "App Handle: jarvis2-0"

## 📊 Success Criteria

✅ **Page loads without errors**
✅ **Store handle extracted correctly**
✅ **URLs generate with correct format**
✅ **Buttons trigger redirects**
✅ **New tabs/windows open for Shopify URLs**

## 🐛 Troubleshooting

### Error: "Cannot read properties of undefined"
- Check if session data is loading properly
- Verify authentication is working

### Error: "Redirect failed"
- Check browser popup settings
- Verify App Bridge is initialized

### URLs don't match expected format
- Check store handle extraction logic
- Verify app handle is "jarvis2-0"

## 📝 Test Results Template

```
Date: [DATE]
Tester: [NAME]

✅/❌ Billing page loads
✅/❌ Store handle detected: [DETECTED_HANDLE]
✅/❌ URLs generated correctly
✅/❌ Essential Chat button redirects
✅/❌ Sales Pro button redirects
✅/❌ Manage Plans button redirects

Generated URLs:
- Pricing: [URL]
- Billing: [URL]

Notes:
[ANY OBSERVATIONS]
```

## 🚀 Next: Partners Dashboard Setup

Once development testing passes:
1. Go to Shopify Partners dashboard
2. Navigate to your Jarvis 2.0 app
3. Set up Managed Pricing with your two plans
4. Test again with live pricing integration
