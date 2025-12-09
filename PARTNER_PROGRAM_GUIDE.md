# Partner Program Implementation Guide

## Overview
This partner program allows agencies to refer merchants and earn **25% commission** on all billing. Payouts are processed manually with a **$25 minimum threshold** for efficiency.

---

## 🗄️ Database Schema

The partner program uses three main tables:

### 1. **Agency** Table
Stores partner/agency information and payment details.

```prisma
model Agency {
  id                      String             @id @default(cuid())
  name                    String
  email                   String             @unique
  referralCode            String             @unique
  paymentMethod           String?            // 'wise', 'paypal', 'bank_transfer'
  paymentEmail            String?
  minimumPayoutThreshold  Decimal            @default(25.00)
  active                  Boolean            @default(true)
  paymentVerified         Boolean            @default(false)
}
```

### 2. **MerchantReferral** Table
Links merchants to referring agencies and tracks revenue.

```prisma
model MerchantReferral {
  id                String    @id @default(cuid())
  shopDomain        String    @unique
  agencyId          String
  lifetimeRevenue   Decimal   @default(0)
  active            Boolean   @default(true)
}
```

### 3. **PartnerPayout** Table
Monthly ledger for commission calculations.

```prisma
model PartnerPayout {
  id                  String    @id @default(cuid())
  agencyId            String
  monthFor            DateTime
  grossAmount         Decimal   @default(0)
  commissionAmount    Decimal   @default(0)
  commissionRate      Decimal   @default(0.25)  // 25%
  paid                Boolean   @default(false)
  paymentReference    String?
  paidAt              DateTime?
}
```

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_partner_program
npx prisma generate
```

### Step 2: Set Environment Variables

Add to your `.env` file:

```env
# Shopify Webhook Secret (from Partners Dashboard)
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# App URL
SHOPIFY_APP_URL=https://your-app.onrender.com
```

### Step 3: Register Webhooks

After installing the app on a shop, register partner webhooks:

```bash
# Via API endpoint
GET/POST https://your-app.onrender.com/api/register-partner-webhooks
```

Or programmatically after app installation.

---

## 📊 How It Works

### 1. **Agency Onboarding**

Create a new partner agency:

```bash
POST /api/partner-agencies
Content-Type: application/json

{
  "action": "create",
  "name": "Acme Agency",
  "email": "partner@acme.com",
  "paymentMethod": "paypal",
  "paymentEmail": "payments@acme.com",
  "minimumThreshold": 25.00
}
```

This generates:
- Unique referral code (e.g., `ACME-A1B2C3`)
- Partner dashboard access
- Payment tracking

### 2. **Merchant Referral Tracking**

Link a merchant to an agency:

```bash
POST /api/partner-agencies
Content-Type: application/json

{
  "action": "link-merchant",
  "shopDomain": "store.myshopify.com",
  "agencyId": "clx123abc"
}
```

### 3. **Automatic Commission Recording**

When Shopify bills a referred merchant:

1. **Webhook triggers**: `APP_SUBSCRIPTIONS_UPDATE`
2. **System extracts**: Billing amount from payload
3. **Database updates**:
   - `MerchantReferral.lifetimeRevenue` += amount
   - `PartnerPayout.grossAmount` += amount
   - `PartnerPayout.commissionAmount` += amount × 0.25

**Example:**
- Merchant billed: $100
- Commission recorded: $25 (25%)
- Agency balance updated automatically

### 4. **Monthly Aggregation**

Commissions are aggregated by month (first day of month):

```
Month          | Gross Revenue | Commission (25%)
---------------|---------------|------------------
2025-01-01     | $1,200        | $300
2025-02-01     | $1,500        | $375
```

---

## 💰 Payout Process (Manual)

### Step 1: Export Unpaid Payouts

```bash
GET /api/partner-payouts?action=export-csv
```

Downloads CSV with:
- Partner Name
- Email
- Payment Method
- Payment Email
- Months Included
- Gross Revenue
- **Commission (25%)**
- Payment Reference (blank)

**Example CSV:**

```csv
Partner Name,Email,Payment Method,Payment Email,Months Included,Gross Revenue,Commission (25%),Payment Reference
Acme Agency,partner@acme.com,paypal,payments@acme.com,2025-01;2025-02,2700.00,675.00,
```

### Step 2: Filter by Minimum Threshold

Only agencies with **≥ $25 commission** are included in export.

Agencies below threshold are rolled over to next month.

### Step 3: Process Payments

**Option A: PayPal Payouts**
1. Upload CSV to PayPal Mass Payment
2. Process batch payment
3. Get payment reference ID

**Option B: Wise Batch Transfer**
1. Import CSV to Wise
2. Process transfers
3. Get transaction references

**Option C: Manual Transfer**
1. Send bank transfers individually
2. Record transaction IDs

### Step 4: Mark as Paid

```bash
POST /api/partner-payouts
Content-Type: application/json

{
  "action": "mark-paid",
  "payoutIds": "clx123,clx124,clx125",
  "paymentReference": "PAYPAL-BATCH-2025-02-28",
  "paymentMethod": "paypal"
}
```

This updates:
- `paid` = true
- `paidAt` = current timestamp
- `paymentReference` = your reference

---

## 📈 Reports & Analytics

### Get Full Payout Report

```bash
GET /api/partner-payouts?action=report
```

Returns:
```json
{
  "readyToPay": {
    "agencies": 5,
    "totalAmount": 1250.00,
    "payouts": [...]
  },
  "belowThreshold": {
    "count": 3,
    "agencies": [
      {
        "name": "Small Agency",
        "currentBalance": 12.50,
        "threshold": 25.00,
        "amountNeeded": 12.50,
        "monthsPending": 2
      }
    ]
  },
  "allTime": {
    "totalGross": 45000.00,
    "totalCommission": 11250.00,
    "paidOut": 10000.00
  }
}
```

### Get Agency Details

```bash
GET /api/partner-payouts?action=agency-details&agencyId=clx123
```

Returns detailed breakdown by month for specific agency.

### View Agencies Below Threshold

```bash
GET /api/partner-payouts?action=below-threshold
```

Shows agencies with pending balance < $25.

---

## 🔧 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/partner-agencies` | GET | List all agencies |
| `/api/partner-agencies` | POST | Create/update agency |
| `/api/partner-payouts` | GET | View payouts/reports |
| `/api/partner-payouts` | POST | Mark payouts as paid |
| `/api/partner-billing` | POST | Webhook handler (Shopify) |
| `/api/register-partner-webhooks` | GET/POST | Register webhooks |

---

## 🔐 Security Considerations

### 1. **Webhook Verification**
All webhooks verify HMAC signatures:
```javascript
const digest = crypto
  .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
  .update(rawBody, 'utf8')
  .digest('base64');
```

### 2. **Authentication**
All admin endpoints require Shopify admin authentication:
```javascript
await authenticate.admin(request);
```

### 3. **Payment Data Encryption**
Store bank details encrypted:
```javascript
// Use crypto or external vault service
bankAccountEncrypted: encrypt(bankDetails)
```

---

## 📋 Google Sheets Integration

### Formula to Calculate Total Owed

In your Google Sheet, use:

```excel
=SUMIF(H:H, FALSE, G:G)
```

Where:
- Column G = Commission Amount
- Column H = Paid Status (TRUE/FALSE)

### Pivot Table for Agency Summary

1. **Rows**: Partner Name
2. **Values**: 
   - SUM of Commission Amount
   - COUNT of Months
3. **Filter**: Paid = FALSE

---

## 🎯 Best Practices

### 1. **Regular Payout Schedule**
- Process payouts monthly (e.g., 1st of each month)
- Send notification emails before processing
- Give agencies 5 days to update payment details

### 2. **Payment Methods**
- **PayPal**: Fastest, supports multiple currencies
- **Wise**: Best rates for international transfers
- **Bank Transfer**: Traditional but slower

### 3. **Minimum Threshold Management**
- Default: $25 (reduces transaction fees)
- Allow custom thresholds per agency
- Roll over balances automatically

### 4. **Record Keeping**
- Export CSV after each payout
- Store in Google Drive with timestamp
- Keep payment references for 7 years

### 5. **Tax Compliance**
- Issue 1099 forms (US partners earning > $600/year)
- Collect W-9 forms during onboarding
- Track by calendar year for reporting

---

## 🧪 Testing

### Test Webhook Locally

```bash
# Use Shopify CLI to forward webhooks
npm run shopify app dev

# Then trigger test webhook from Shopify admin
```

### Create Test Agency

```javascript
await prisma.agency.create({
  data: {
    name: 'Test Agency',
    email: 'test@example.com',
    referralCode: 'TEST-123',
    paymentMethod: 'paypal',
    paymentEmail: 'test@paypal.com',
  }
});
```

### Simulate Billing Event

```bash
POST /api/partner-billing
X-Shopify-Topic: app_subscriptions/update
X-Shopify-Shop-Domain: test-store.myshopify.com
X-Shopify-Hmac-Sha256: <valid_hmac>

{
  "app_subscription": {
    "line_items": [{
      "plan": {
        "pricing_details": {
          "price": { "amount": "29.99" }
        }
      }
    }]
  }
}
```

---

## 📞 Support

For questions about the partner program implementation:

1. Check logs in Render dashboard
2. Review Prisma Studio for data verification
3. Test webhooks using Shopify CLI
4. Verify HMAC secrets match between Shopify and .env

---

## 🔄 Changelog

- **v1.0** - Initial implementation with 25% commission
- **v1.0** - $25 minimum payout threshold
- **v1.0** - Manual payout process with CSV export
- **v1.0** - Support for PayPal, Wise, Bank Transfer

---

## 📚 Additional Resources

- [Shopify Billing Webhooks](https://shopify.dev/docs/apps/billing/subscriptions/webhooks)
- [PayPal Mass Payments](https://www.paypal.com/us/business/accept-payments/payouts)
- [Wise Batch Payments](https://wise.com/help/articles/2827880/batch-payments)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
