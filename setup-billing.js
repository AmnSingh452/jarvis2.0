import { createDefaultPlans } from "./app/utils/billing.js";

async function setupBilling() {
  console.log("🚀 Setting up billing system...");
  
  try {
    const result = await createDefaultPlans();
    
    if (result.success) {
      console.log("✅ Billing system setup completed successfully!");
      console.log("\nDefault plans created:");
      console.log("- Free Trial: $0/month (100 messages)");
      console.log("- Starter: $9.99/month (1,000 messages)"); 
      console.log("- Professional: $29.99/month (5,000 messages)");
      console.log("- Enterprise: $99.99/month (25,000 messages)");
      console.log("\n🎉 Ready to accept subscriptions!");
    } else {
      console.error("❌ Failed to setup billing system:", result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupBilling();
