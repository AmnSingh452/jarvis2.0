// Script to clean up test/sample data for production readiness
const { PrismaClient } = require('@prisma/client');

async function cleanupTestData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Starting cleanup of test/sample data...\n');
    
    // Delete conversations with test indicators
    const testConversations = await prisma.chatConversation.findMany({
      where: {
        OR: [
          {
            sessionId: {
              contains: 'test'
            }
          },
          {
            customerName: {
              contains: 'Test'
            }
          },
          {
            customerIp: 'anonymous@shop.local'
          },
          {
            topic: 'Live API Test'
          }
        ]
      },
      include: {
        chatMessages: true
      }
    });

    console.log(`🔍 Found ${testConversations.length} test conversations to clean up:`);
    
    for (const conv of testConversations) {
      console.log(`   - ${conv.id}: ${conv.topic} (${conv.chatMessages.length} messages)`);
    }

    if (testConversations.length > 0) {
      console.log('\n🗑️ Deleting test conversations and their messages...');
      
      // Delete messages first (due to foreign key constraints)
      for (const conv of testConversations) {
        await prisma.chatMessage.deleteMany({
          where: {
            conversationId: conv.id
          }
        });
        console.log(`   ✅ Deleted ${conv.chatMessages.length} messages for conversation ${conv.id}`);
      }
      
      // Then delete conversations
      const deletedConversations = await prisma.chatConversation.deleteMany({
        where: {
          id: {
            in: testConversations.map(conv => conv.id)
          }
        }
      });
      
      console.log(`   ✅ Deleted ${deletedConversations.count} test conversations`);
    }
    
    // Also clean up analytics metrics that might have inflated data from tests
    console.log('\n📊 Checking analytics metrics...');
    
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = await prisma.analyticsMetrics.findMany({
      where: {
        date: {
          gte: new Date(today)
        }
      }
    });
    
    console.log(`Found ${todayMetrics.length} analytics records for today`);
    
    // For each shop, recalculate metrics based on remaining real conversations
    for (const metric of todayMetrics) {
      console.log(`\n📈 Recalculating metrics for ${metric.shopDomain}...`);
      
      // Count real conversations for today
      const realConversationsToday = await prisma.chatConversation.count({
        where: {
          shopDomain: metric.shopDomain,
          startTime: {
            gte: new Date(today)
          }
        }
      });
      
      // Count real messages for today
      const realMessagesToday = await prisma.chatMessage.count({
        where: {
          conversation: {
            shopDomain: metric.shopDomain,
            startTime: {
              gte: new Date(today)
            }
          }
        }
      });
      
      // Update the metrics with accurate data
      await prisma.analyticsMetrics.update({
        where: {
          id: metric.id
        },
        data: {
          totalConversations: realConversationsToday,
          uniqueVisitors: realConversationsToday, // Assuming 1 visitor per conversation for now
          totalMessages: realMessagesToday,
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ Updated: ${realConversationsToday} conversations, ${realMessagesToday} messages`);
    }
    
    // Final verification
    console.log('\n✅ Cleanup completed! Final verification:');
    
    const finalConversations = await prisma.chatConversation.findMany({
      where: {
        shopDomain: 'aman-chatbot-test.myshopify.com'
      },
      include: {
        chatMessages: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`\n📊 Final state for aman-chatbot-test.myshopify.com:`);
    console.log(`   - Total conversations: ${finalConversations.length}`);
    
    const todayConversations = finalConversations.filter(conv => {
      const convDate = conv.startTime.toISOString().split('T')[0];
      return convDate === today;
    });
    
    console.log(`   - Today's conversations: ${todayConversations.length}`);
    
    if (todayConversations.length > 0) {
      console.log('\n📝 Remaining conversations:');
      todayConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. Topic: ${conv.topic}, Messages: ${conv.chatMessages.length}`);
        if (conv.chatMessages.length > 0) {
          const firstUserMessage = conv.chatMessages.find(msg => msg.role === 'user');
          if (firstUserMessage) {
            console.log(`      First message: "${firstUserMessage.content.substring(0, 50)}..."`);
          }
        }
      });
    }
    
    console.log('\n🎉 Your analytics will now show only real customer data!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
