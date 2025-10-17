import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const plans = await prisma.plan.findMany();
    await prisma.$disconnect();

    return json({
      totalPlans: plans.length,
      plans: plans
    });

  } catch (error) {
    await prisma.$disconnect();
    return json({ 
      error: error.message
    }, { status: 500 });
  }
}