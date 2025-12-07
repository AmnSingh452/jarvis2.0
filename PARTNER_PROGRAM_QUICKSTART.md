# Partner Program - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Migration
```bash
npx prisma migrate dev --name add_partner_program
npx prisma generate
```

### Step 2: Register Webhooks
In your Shopify Partners dashboard or via CLI:
- Topic: `app_subscriptions/update`
- URL: `https://your-app.com/api/partner-billing`

### Step 3: Add Your First Agency
```javascript
// POST /api/partner-agencies
{
  "name": "Marketing Agency Ltd",
  "email": "payouts@agency.com",
  "referralCode": "AGENCY001",
  "paymentMethod": "paypal",
  "paymentEmail": "payouts@agency.com",
  "minimumPayoutThreshold": 25.00
}
```

### Step 4: Test with Billing
When a merchant is charged, the webhook will:
1. Record the revenue
2. Calculate 25% commission
3. Add to monthly payout ledger

---

## 💰 Monthly Payout Process (10 Minutes)

### Day 1: Export CSV
```bash
curl https://your-app.com/api/partner-payouts?action=export-csv > payouts.csv
```

### Day 2: Review CSV
```csv
Partner Name,Email,Month,Gross Revenue,Commission (25%),Payment Reference,Payment Method
Agency A,a@agency.com,2025-12,$299.95,$74.99,,paypal
Agency B,b@agency.com,2025-12,$199.96,$50.00,,wise
```

### Day 3: Process Payments

#### For PayPal:
1. Go to PayPal Business → Mass Payments
2. Upload CSV or enter manually
3. Get batch reference (e.g., `PAYPAL_BATCH_123`)

#### For Wise:
1. Go to Wise Business → Batch Payments
2. Upload recipients and amounts
3. Get batch reference (e.g., `WISE_BATCH_456`)

### Day 4: Mark as Paid
```bash
curl -X POST https://your-app.com/api/partner-payouts \
  -d "action=mark-paid" \
  -d "payoutIds=payout_1,payout_2" \
  -d "paymentReference=PAYPAL_BATCH_123" \
  -d "paymentMethod=paypal"
```

---

## 🧪 Testing Your Setup

### Test 1: Run Logic Tests
```bash
node test-partner-program.js
```
Expected: All green checkmarks ✓

### Test 2: Run API Tests
```bash
node test-partner-api.js
```
Expected: All tests passing ✓

### Test 3: Verify Files
```bash
node verify-partner-setup.js
```
Expected: All models found ✓

---

## 📊 Commission Examples

| Billing Amount | Commission (25%) | Status |
|---------------|------------------|---------|
| $9.99         | $2.50            | HOLD    |
| $24.99        | $6.25            | HOLD    |
| $29.99        | $7.50            | HOLD    |
| $100.00       | $25.00           | **PAY** |
| $199.99       | $50.00           | **PAY** |

**Note**: Commissions below $25 accumulate until threshold is met.

---

## 🔍 Common Queries

### Get Unpaid Payouts
```bash
GET /api/partner-payouts?action=report
```

### Get Agencies Below Threshold
```bash
GET /api/partner-payouts?action=below-threshold
```

### Get Agency Details
```bash
GET /api/partner-payouts?action=agency-details&agencyId=agency_123
```

---

## ⚠️ Important Rules

1. **Minimum Payout**: $25 threshold
2. **Commission Rate**: 25% (fixed)
3. **Payout Timing**: Manual monthly process
4. **Rollover**: Automatic for amounts < $25
5. **Payment Methods**: PayPal or Wise recommended

---

## 📝 Monthly Checklist

- [ ] Export CSV on last day of month
- [ ] Review payout amounts
- [ ] Process PayPal batch
- [ ] Process Wise batch
- [ ] Mark all as paid in database
- [ ] Save payment references
- [ ] Send confirmation emails to agencies

---

## 🆘 Troubleshooting

### Webhook Not Received
1. Check webhook registration in Shopify
2. Verify URL is publicly accessible
3. Check HMAC secret in environment

### Commission Not Calculated
1. Check merchant referral exists
2. Verify agency is active
3. Check database logs

### CSV Empty
1. Check if any payouts >= $25
2. Verify payouts not already marked as paid
3. Run below-threshold query

---

## 🎯 Success Metrics

After setup, you should see:
- ✅ Webhooks being received
- ✅ Commissions being recorded
- ✅ Monthly CSV exports working
- ✅ Payouts being processed
- ✅ Agencies being paid on time

---

## 📞 Quick Commands Reference

```bash
# Export payouts
curl "https://your-app.com/api/partner-payouts?action=export-csv"

# Get report
curl "https://your-app.com/api/partner-payouts?action=report"

# Mark as paid
curl -X POST https://your-app.com/api/partner-payouts \
  -d "action=mark-paid" \
  -d "payoutIds=id1,id2" \
  -d "paymentReference=BATCH_123" \
  -d "paymentMethod=paypal"

# Run tests
node test-partner-program.js
node test-partner-api.js
node verify-partner-setup.js
```

---

**Ready to go! 🚀**

Questions? Check `PARTNER_PROGRAM_SUMMARY.md` for detailed documentation.
