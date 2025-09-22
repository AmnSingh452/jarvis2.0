// Production-ready billing implementation for Shopify App Store
export async function requirePlan(admin, plans) {
  try {
    return await admin.billing.require({
      plans: Array.isArray(plans) ? plans : [plans],
      isTest: process.env.NODE_ENV !== "production",
      returnObject: true,
    });
  } catch (error) {
    console.error("Billing require error:", error);
    throw error;
  }
}

export async function requestPlan(admin, plan, returnUrl) {
  try {
    return await admin.billing.request({
      plan,
      isTest: process.env.NODE_ENV !== "production", 
      returnUrl: returnUrl || `${process.env.SHOPIFY_APP_URL}/app/billing`,
    });
  } catch (error) {
    console.error("Billing request error:", error);
    throw error;
  }
}

export async function getPlanStatus(admin) {
  try {
    const billing = await admin.billing.check({
      plans: ["Essential Chat", "Sales Pro"],
      isTest: process.env.NODE_ENV !== "production",
    });
    return billing;
  } catch (error) {
    console.error("Billing check error:", error);
    return null;
  }
}

export const BILLING_PLANS = {
  ESSENTIAL: "Essential Chat",
  PRO: "Sales Pro",
};
