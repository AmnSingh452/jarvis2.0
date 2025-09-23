const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const conversations = await prisma.chatConversation.findMany({
      orderBy: { startTime: 'desc' },
      take: 5,
      select: {
        id: true,
        shopDomain: true,
        customerName: true,
        startTime: true,
        topic: true,
        status: true
      }
    });
    
    console.log('Recent conversations:');
    console.log(JSON.stringify(conversations, null, 2));
    
    const metrics = await prisma.analyticsMetrics.findMany({
      orderBy: { date: 'desc' },
      take: 3,
      select: {
        shopDomain: true,
        date: true,
        totalConversations: true
      }
    });
    
    console.log('\nRecent metrics:');
    console.log(JSON.stringify(metrics, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
