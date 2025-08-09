// Quick test to verify store handle extraction
// Run this in your browser console when on the billing page

console.log("=== Billing Integration Test ===");

// Test store handle extraction
const testStoreDomain = "aman-chatbot-test.myshopify.com";
const extractedHandle = testStoreDomain.replace('.myshopify.com', '');
console.log("Store Domain:", testStoreDomain);
console.log("Extracted Handle:", extractedHandle);

// Test URL generation
const appHandle = "jarvis2-0";
const pricingUrl = `https://admin.shopify.com/store/${extractedHandle}/charges/${appHandle}/pricing_plans`;
const billingUrl = `https://admin.shopify.com/store/${extractedHandle}/charges/${appHandle}`;

console.log("Generated URLs:");
console.log("Pricing Plans:", pricingUrl);
console.log("Billing Management:", billingUrl);

// Expected URLs for your development store
console.log("\n=== Expected URLs for Development ===");
console.log("Pricing:", "https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0/pricing_plans");
console.log("Billing:", "https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0");

// Test if URLs match
const expectedPricing = "https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0/pricing_plans";
const expectedBilling = "https://admin.shopify.com/store/aman-chatbot-test/charges/jarvis2-0";

console.log("\n=== URL Validation ===");
console.log("Pricing URL Correct:", pricingUrl === expectedPricing);
console.log("Billing URL Correct:", billingUrl === expectedBilling);

if (pricingUrl === expectedPricing && billingUrl === expectedBilling) {
    console.log("✅ SUCCESS: All URLs generated correctly!");
} else {
    console.log("❌ ERROR: URL generation mismatch");
}
