import { json } from "@remix-run/node";

export async function action({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    
    if (action === "create_plans") {
      // Create Essential Plan
      const essentialPlan = await prisma.plan.create({
        data: {
          name: "Essential",
          price: 14.99,
          billingCycle: "monthly",
          messagesLimit: 1000,
          features: {
            messages: 1000,
            analytics: true,
            cartRecovery: true,
            customization: "basic"
          },
          isActive: true
        }
      });

      // Create Sales Pro Plan  
      const salesProPlan = await prisma.plan.create({
        data: {
          name: "Sales Pro",
          price: 39.99,
          billingCycle: "monthly", 
          messagesLimit: -1, // -1 for unlimited
          features: {
            messages: "unlimited",
            analytics: true,
            cartRecovery: true,
            customization: "advanced",
            priority: true
          },
          isActive: true
        }
      });

      await prisma.$disconnect();

      return json({
        success: true,
        message: "Plans created successfully",
        plans: [essentialPlan, salesProPlan]
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ 
    message: "POST with action=create_plans to create Essential and Sales Pro plans"
  });
}