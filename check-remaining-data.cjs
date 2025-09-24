const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRemaining() {
  try {
    const conversations = await prisma.chatConversation.findMany({
      select: { 
        id: true, 
        customerName: true, 
        topic: true, 
        sessionId: true, 
        converted: true, 
        conversionValue: true,
        startTime: true 
      },
      orderBy: { startTime: 'desc' }
    });

    console.log('Remaining conversations:', conversations.length);
    conversations.forEach((conv, i) => {
      console.log(`${i+1}. ${conv.customerName || 'Anonymous'} | ${conv.topic || 'General'} | ${conv.sessionId} | Converted: ${conv.converted}`);
    });

    // Check analytics metrics
    const metrics = await prisma.analyticsMetrics.findMany({
      select: { 
        shopDomain: true, 
        date: true, 
        totalConversations: true, 
        conversions: true, 
        revenue: true 
      }
    });

    console.log('\nAnalytics metrics records:', metrics.length);
    metrics.forEach((metric, i) => {
      console.log(`${i+1}. ${metric.shopDomain} | ${metric.date.toISOString().split('T')[0]} | Conversations: ${metric.totalConversations} | Revenue: $${metric.revenue}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRemaining();
