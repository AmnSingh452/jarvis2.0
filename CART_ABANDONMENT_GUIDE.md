# 🛒 Cart Abandonment Recovery - Implementation Guide

## Overview

The Cart Abandonment Recovery feature automatically detects when customers abandon their shopping carts after interacting with your chatbot, and offers them personalized discount codes to encourage purchase completion.

## Features

- ✅ **Automatic Detection**: Monitors cart state and user interactions with the chatbot
- ✅ **Configurable Discounts**: Set discount percentage (5-50%) per shop
- ✅ **Customizable Messages**: Personalize the abandonment recovery message
- ✅ **Flexible Timing**: Configure delay before offering discount (1-30 minutes)
- ✅ **Anti-Abuse Protection**: One discount per customer per hour
- ✅ **Real-time Integration**: Works with Shopify's cart.js API
- ✅ **Multi-tenant Support**: Different settings per shop
- ✅ **Comprehensive Logging**: Track discount usage and effectiveness

## How It Works

1. **Cart Monitoring**: JavaScript continuously monitors the customer's cart state
2. **Interaction Tracking**: Detects when customers interact with the chatbot widget
3. **Abandonment Detection**: After configured delay, triggers recovery if cart is still active
4. **Discount Generation**: Creates unique discount code via Shopify API
5. **Message Delivery**: Shows personalized message with discount in chatbot
6. **Purchase Tracking**: Logs discount usage for analytics

## Setup Instructions

### 1. Configure Settings

1. Go to **Widget Settings** in your Shopify app admin
2. Enable **Cart Abandonment Recovery**
3. Set your desired **discount percentage** (5-50%)
4. Configure **trigger delay** (60-1800 seconds)
5. Customize the **recovery message** using placeholders:
   - `{discount_percentage}` - The discount amount
   - `{discount_code}` - The generated discount code
   - `{shop_name}` - Your shop name

### 2. Theme Integration

#### Option A: Automatic Integration (Recommended)
The cart abandonment detector is automatically included when customers interact with your Jarvis chatbot widget.

#### Option B: Manual Theme Integration
If you need custom integration, add these files to your theme:

1. **Add JavaScript File**:
   - Upload `cart-abandonment-detector.js` to your theme's `assets` folder
   - Include it in your `theme.liquid` before `</body>`:
   ```liquid
   <script src="{{ 'cart-abandonment-detector.js' | asset_url }}" defer></script>
   ```

2. **Add Liquid Snippet**:
   - Upload `jarvis-cart-abandonment.liquid` to your theme's `snippets` folder
   - Include it in your `theme.liquid`:
   ```liquid
   {% render 'jarvis-cart-abandonment' %}
   ```

### 3. Test the Feature

1. Go to **Cart Recovery Test** in your app admin
2. Click **Test Cart Abandonment** to simulate the flow
3. Verify the discount code is generated successfully
4. Test on your actual store:
   - Add items to cart
   - Open the chatbot and interact
   - Wait for the configured delay
   - Verify discount offer appears

## API Endpoints

### POST `/api/cart-abandonment`

Triggers cart abandonment recovery for a session.

**Request Body:**
```json
{
  "session_id": "cart_1234567890_abc123",
  "shop_domain": "your-shop.myshopify.com",
  "customer_id": "12345678" // optional, null for anonymous
  "cart_total": "99.99"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "discount_code": "CART20-ABC123",
  "discount_percentage": 20,
  "message": "Don't miss out! Use code CART20-ABC123 for 20% off your order!",
  "expires_at": "2024-01-15T12:00:00Z"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Cart abandonment not enabled for this shop",
  "details": "..."
}
```

## Database Schema

### WidgetSettings Model
```prisma
model WidgetSettings {
  id                        Int     @id @default(autoincrement())
  shopDomain               String  @unique
  cartAbandonmentEnabled   Boolean @default(false)
  cartAbandonmentDiscount  Int     @default(15)
  cartAbandonmentMessage   String  @default("Don't miss out! Use code {discount_code} for {discount_percentage}% off your order!")
  cartAbandonmentDelay     Int     @default(300)
  // ... other fields
}
```

### CartAbandonmentLog Model
```prisma
model CartAbandonmentLog {
  id                String   @id @default(cuid())
  shopDomain        String
  sessionId         String
  customerId        String?
  discountCode      String
  discountPercentage Int
  cartTotal         Decimal
  used              Boolean  @default(false)
  createdAt         DateTime @default(now())
  
  @@index([shopDomain, createdAt])
  @@index([customerId, createdAt])
}
```

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cartAbandonmentEnabled` | Boolean | `false` | Enable/disable the feature |
| `cartAbandonmentDiscount` | Integer | `15` | Discount percentage (5-50) |
| `cartAbandonmentDelay` | Integer | `300` | Delay in seconds (60-1800) |
| `cartAbandonmentMessage` | String | Template | Custom message with placeholders |

## Message Placeholders

Use these placeholders in your recovery message:

- `{discount_percentage}` → `20`
- `{discount_code}` → `CART20-ABC123`
- `{shop_name}` → `Your Shop Name`
- `{cart_total}` → `$99.99`

**Example:**
```
"Hi! I noticed you left items in your cart. Use code {discount_code} for {discount_percentage}% off your ${cart_total} order!"
```

**Result:**
```
"Hi! I noticed you left items in your cart. Use code CART20-ABC123 for 20% off your $99.99 order!"
```

## Anti-Abuse Measures

1. **Time Limits**: Only one discount per customer per hour
2. **Usage Tracking**: Discount codes are logged and monitored
3. **Cart Validation**: Only triggers for carts with actual items
4. **Session Tracking**: Prevents duplicate offers for same session

## Analytics & Reporting

### Available Metrics
- Total abandonment recovery attempts
- Discount codes generated
- Discount codes used
- Conversion rate (codes used / codes generated)
- Revenue recovered
- Average cart value recovered

### Accessing Data
1. Go to **Cart Recovery Test** page
2. View **Recent Activity** section
3. Check individual discount code usage
4. Monitor conversion rates

## Troubleshooting

### Common Issues

**❌ Discount not triggering**
- Check if cart abandonment is enabled in settings
- Verify customer interacted with chatbot
- Ensure cart has items and meets minimum requirements
- Check browser console for JavaScript errors

**❌ Discount code invalid**
- Verify Shopify API credentials are correct
- Check if discount code was created in Shopify admin
- Ensure discount hasn't expired or reached usage limit

**❌ API errors**
- Check server logs for detailed error messages
- Verify database connection is working
- Ensure external API (cartrecover-bot) is accessible

### Debug Mode

Enable debug mode by adding this to your theme:
```javascript
window.jarvisDebugMode = true;
```

This will log detailed information to the browser console.

### Testing Checklist

- [ ] Cart abandonment enabled in settings
- [ ] Discount percentage set (5-50%)
- [ ] Custom message configured
- [ ] Delay time appropriate for your store
- [ ] JavaScript files loaded correctly
- [ ] Chatbot widget detectable on page
- [ ] Cart.js API accessible
- [ ] Discount codes created in Shopify
- [ ] Database logging working
- [ ] External API responding

## Best Practices

### 1. Timing
- **5-10 minutes**: Good for high-engagement stores
- **10-15 minutes**: Standard for most e-commerce
- **15-30 minutes**: Conservative approach for luxury items

### 2. Discount Amounts
- **5-10%**: Conservative, higher conversion
- **15-20%**: Balanced approach
- **25-50%**: Aggressive, use for special campaigns

### 3. Messages
- Keep messages friendly and personal
- Create urgency without being pushy
- Test different message variations
- Use customer's name if available

### 4. Monitoring
- Review conversion rates weekly
- Adjust timing based on customer behavior
- Monitor discount abuse patterns
- Track revenue impact vs. discount costs

## Support

If you need help implementing cart abandonment recovery:

1. Check the **Cart Recovery Test** page for configuration issues
2. Review browser console for JavaScript errors
3. Check server logs for API errors
4. Contact support with specific error messages

## Changelog

### v1.0.0 (Current)
- ✅ Initial cart abandonment recovery implementation
- ✅ Configurable discount percentages and timing
- ✅ Anti-abuse protection with hourly limits
- ✅ Comprehensive logging and analytics
- ✅ Multi-tenant support for different shop settings
- ✅ Integration with external discount API
- ✅ Real-time cart monitoring and detection
