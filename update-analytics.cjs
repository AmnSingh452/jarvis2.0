const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAnalyticsMetrics() {
  try {
    console.log('📊 Updating analytics metrics based on actual conversations...');
    
    // Get all analytics metrics that need updating
    const metrics = await prisma.analyticsMetrics.findMany({
      orderBy: { date: 'desc' }
    });

    for (const metric of metrics) {
      const startDate = new Date(metric.date);
      const endDate = new Date(metric.date);
      endDate.setDate(endDate.getDate() + 1); // Next day

      // Count actual conversations for this day
      const conversationCount = await prisma.chatConversation.count({
        where: {
          shopDomain: metric.shopDomain,
          startTime: {
            gte: startDate,
            lt: endDate
          }
        }
      });

      // Count unique visitors (using customer IP as proxy)
      const uniqueVisitorResult = await prisma.chatConversation.groupBy({
        by: ['customerIp'],
        where: {
          shopDomain: metric.shopDomain,
          startTime: {
            gte: startDate,
            lt: endDate
          }
        }
      });

      const uniqueVisitors = uniqueVisitorResult.length;

      // Update the metric
      await prisma.analyticsMetrics.update({
        where: { id: metric.id },
        data: {
          totalConversations: conversationCount,
          uniqueVisitors: Math.max(uniqueVisitors, conversationCount) // At least as many visitors as conversations
        }
      });

      console.log(`✅ Updated ${metric.shopDomain} ${metric.date.toISOString().split('T')[0]}: ${conversationCount} conversations, ${uniqueVisitors} visitors`);
    }

    console.log('🎉 Analytics metrics updated successfully!');

  } catch (error) {
    console.error('❌ Error updating analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAnalyticsMetrics();
