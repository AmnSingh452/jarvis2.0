const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAnalyticsMetrics() {
  try {
    console.log('Starting cleanup of fake analytics metrics...');
    
    // First, show what will be deleted
    const metricsToDelete = await prisma.analyticsMetrics.findMany({
      where: {
        OR: [
          { revenue: { gt: 0 } }, // Any metrics with fake revenue
          { conversions: { gt: 0 } }, // Any metrics with fake conversions
          { totalConversations: { gt: 1 } } // More than 1 conversation (only 1 real one exists)
        ]
      }
    });

    console.log(`Found ${metricsToDelete.length} fake analytics metrics to delete:`);
    metricsToDelete.forEach((metric, i) => {
      console.log(`${i+1}. ${metric.date.toISOString().split('T')[0]} | Conversations: ${metric.totalConversations} | Conversions: ${metric.conversions} | Revenue: $${metric.revenue}`);
    });

    // Delete fake analytics metrics
    const deleteResult = await prisma.analyticsMetrics.deleteMany({
      where: {
        OR: [
          { revenue: { gt: 0 } }, // Any metrics with fake revenue
          { conversions: { gt: 0 } }, // Any metrics with fake conversions
          { totalConversations: { gt: 1 } } // More than 1 conversation
        ]
      }
    });

    console.log(`\nDeleted ${deleteResult.count} fake analytics metrics records.`);

    // Show what remains
    const remainingMetrics = await prisma.analyticsMetrics.findMany();
    console.log(`\nRemaining analytics metrics: ${remainingMetrics.length}`);
    
    if (remainingMetrics.length > 0) {
      remainingMetrics.forEach((metric, i) => {
        console.log(`${i+1}. ${metric.date.toISOString().split('T')[0]} | Conversations: ${metric.totalConversations} | Conversions: ${metric.conversions} | Revenue: $${metric.revenue}`);
      });
    }

    console.log('\nAnalytics metrics cleanup completed!');

  } catch (error) {
    console.error('Error cleaning analytics metrics:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAnalyticsMetrics();
