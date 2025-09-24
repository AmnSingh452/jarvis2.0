const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnalyticsMetrics() {
  try {
    console.log('🔍 Checking analytics metrics in database...\n');
    
    const metrics = await prisma.analyticsMetrics.findMany({
      where: {
        shopDomain: 'aman-chatbot-test.myshopify.com'
      },
      orderBy: { date: 'desc' }
    });
    
    console.log(`Found ${metrics.length} analytics metrics records:\n`);
    
    metrics.forEach((metric, i) => {
      console.log(`${i+1}. Date: ${metric.date.toISOString().split('T')[0]}`);
      console.log(`   Shop: ${metric.shopDomain}`);
      console.log(`   Conversations: ${metric.totalConversations}`);
      console.log(`   Messages: ${metric.totalMessages}`);
      console.log(`   Conversions: ${metric.conversions}`);
      console.log(`   Revenue: $${metric.revenue}`);
      console.log(`   Top Questions: ${JSON.stringify(metric.topQuestions, null, 2)}`);
      console.log(`   Updated: ${metric.updatedAt?.toISOString() || 'Never'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnalyticsMetrics();
