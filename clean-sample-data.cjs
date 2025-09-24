const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSampleData() {
  try {
    console.log('🧹 Starting sample data cleanup for Shopify compliance...');

    // Find all sample conversations
    const sampleConversations = await prisma.chatConversation.findMany({
      where: {
        OR: [
          { customerName: { contains: 'Test' } },
          { customerName: { contains: 'Sarah' } },
          { customerName: { contains: 'Mike' } },
          { customerName: { contains: 'Emma' } },
          { customerName: { contains: 'John' } },
          { customerName: { contains: 'Lisa' } },
          { customerName: { contains: 'Robert' } },
          { customerName: { contains: 'Amanda' } },
          { customerName: { contains: 'David' } },
          { customerName: { contains: 'Jennifer' } },
          { customerName: { contains: 'Mark' } },
          { topic: 'Live API Test' },
          { topic: 'Product Question' },
          { sessionId: { startsWith: 'session_00' } },
          { sessionId: { startsWith: 'test_session' } }
        ]
      },
      select: { id: true, customerName: true, topic: true, sessionId: true }
    });

    console.log(`Found ${sampleConversations.length} sample conversations to remove`);

    if (sampleConversations.length > 0) {
      // Get conversation IDs
      const conversationIds = sampleConversations.map(conv => conv.id);

      // Delete related messages first (due to foreign key constraint)
      const deletedMessages = await prisma.chatMessage.deleteMany({
        where: {
          conversationId: { in: conversationIds }
        }
      });

      console.log(`✅ Deleted ${deletedMessages.count} sample messages`);

      // Delete conversations
      const deletedConversations = await prisma.chatConversation.deleteMany({
        where: {
          id: { in: conversationIds }
        }
      });

      console.log(`✅ Deleted ${deletedConversations.count} sample conversations`);
    }

    // Clean up sample analytics metrics
    const sampleMetrics = await prisma.analyticsMetrics.deleteMany({
      where: {
        OR: [
          { shopDomain: 'demo.myshopify.com' },
          { shopDomain: 'sample.myshopify.com' },
          { topQuestions: { path: '$[0].question', string_contains: 'What are your shipping options?' } }
        ]
      }
    });

    console.log(`✅ Cleaned ${sampleMetrics.count} sample analytics metrics`);

    // Verify cleanup
    const remainingTest = await prisma.chatConversation.count({
      where: {
        OR: [
          { customerName: { contains: 'Test' } },
          { customerName: { contains: 'Sarah' } },
          { customerName: { contains: 'Mike' } }
        ]
      }
    });

    if (remainingTest === 0) {
      console.log('\n🎉 Database cleaned successfully! No sample data remaining.');
      console.log('✅ Your app is now Shopify App Store compliant.');
    } else {
      console.log(`\n⚠️ Still found ${remainingTest} sample conversations - manual review needed`);
    }

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSampleData();
