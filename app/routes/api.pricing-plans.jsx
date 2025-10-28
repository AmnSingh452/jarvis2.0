import { json } from "@remix-run/node";

export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    
    if (action === "create_yearly_plans") {
      // Create Essential Yearly Plan
      const essentialYearly = await prisma.plan.create({
        data: {
          name: "Essential Yearly",
          price: 169.99,
          billingCycle: "yearly",
          messagesLimit: 1000,
          features: {
            messages: 1000,
            analytics: true,
            cartRecovery: true,
            customization: "basic",
            billingCycle: "yearly",
            savings: "Save $9.99/month"
          },
          isActive: true
        }
      });

      // Create Sales Pro Yearly Plan  
      const salesProYearly = await prisma.plan.create({
        data: {
          name: "Sales Pro Yearly",
          price: 459.99,
          billingCycle: "yearly", 
          messagesLimit: -1, // -1 for unlimited
          features: {
            messages: "unlimited",
            analytics: true,
            cartRecovery: true,
            customization: "advanced",
            priority: true,
            billingCycle: "yearly",
            savings: "Save $119.89/month"
          },
          isActive: true
        }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: "Yearly plans created successfully",
        plans: [essentialYearly, salesProYearly],
        summary: {
          essentialYearly: {
            name: essentialYearly.name,
            price: `$${essentialYearly.price}/year`,
            monthlyEquivalent: `$${(essentialYearly.price / 12).toFixed(2)}/month`,
            savings: "vs $14.99/month ($179.88/year)"
          },
          salesProYearly: {
            name: salesProYearly.name,
            price: `$${salesProYearly.price}/year`,
            monthlyEquivalent: `$${(salesProYearly.price / 12).toFixed(2)}/month`,
            savings: "vs $39.99/month ($479.88/year)"
          }
        }
      });
    }

    if (action === "list_all_plans") {
      const plans = await prisma.plan.findMany({
        orderBy: [
          { billingCycle: 'asc' }, // monthly first, then yearly
          { price: 'asc' }
        ]
      });

      await prisma.$disconnect();

      return json({
        success: true,
        totalPlans: plans.length,
        plans: plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          billingCycle: plan.billingCycle,
          messagesLimit: plan.messagesLimit,
          features: plan.features,
          monthlyEquivalent: plan.billingCycle === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price
        }))
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ 
    message: "POST with action=create_yearly_plans to add yearly pricing tiers",
    actions: ["create_yearly_plans", "list_all_plans"],
    pricingStructure: {
      monthly: {
        essential: "$14.99/month",
        salesPro: "$39.99/month"
      },
      yearly: {
        essential: "$169.99/year ($14.17/month - Save $9.99/month)",
        salesPro: "$459.99/year ($38.33/month - Save $20.01/month)"
      },
      trial: "14 days free trial for all plans"
    }
  });
}