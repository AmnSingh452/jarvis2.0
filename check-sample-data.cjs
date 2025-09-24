const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const conversations = await prisma.chatConversation.findMany({
      where: {
        OR: [
          { customerName: { contains: 'Test' } },
          { customerName: { contains: 'Sarah' } },
          { customerName: { contains: 'Mike' } },
          { topic: 'Live API Test' }
        ]
      },
      select: { id: true, customerName: true, topic: true }
    });

    console.log('Sample conversations found:', conversations.length);
    conversations.forEach(conv => {
      console.log(`- ${conv.customerName} | ${conv.topic}`);
    });

    if (conversations.length > 0) {
      console.log('\n⚠️ Found sample data that needs cleaning for Shopify compliance');
      return true;
    } else {
      console.log('\n✅ Database is clean - no sample data found');
      return false;
    }

  } catch (error) {
    console.error('Error:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
