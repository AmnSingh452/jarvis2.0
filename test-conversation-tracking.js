// Test script to verify conversation tracking is working
const { PrismaClient } = require('@prisma/client');

async function testConversationTracking() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing conversation tracking...\n');
    
    // Check current conversations
    const conversations = await prisma.chatConversation.findMany({
      include: {
        messages: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Current conversations: ${conversations.length}`);
    
    // Show recent conversations with their shop domains
    console.log('\n📋 Recent conversations by shop:');
    const conversationsByShop = {};
    conversations.forEach(conv => {
      if (!conversationsByShop[conv.shopDomain]) {
        conversationsByShop[conv.shopDomain] = [];
      }
      conversationsByShop[conv.shopDomain].push({
        id: conv.id,
        topic: conv.topic,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt
      });
    });
    
    Object.entries(conversationsByShop).forEach(([shop, convs]) => {
      console.log(`\n🏪 ${shop}: ${convs.length} conversations`);
      convs.slice(0, 3).forEach(conv => {
        console.log(`   📝 ${conv.topic} (${conv.messageCount} messages) - ${conv.createdAt}`);
      });
    });
    
    // Check analytics metrics
    console.log('\n📈 Analytics metrics:');
    const analytics = await prisma.analyticsMetrics.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 5
    });
    
    analytics.forEach(metric => {
      console.log(`📅 ${metric.date}: ${metric.shopDomain} - ${metric.totalConversations} conversations, ${metric.dailyVisitors} visitors`);
    });
    
    // Check frequently asked questions
    console.log('\n❓ Frequently asked questions structure:');
    const recentAnalytics = analytics[0];
    if (recentAnalytics && recentAnalytics.frequentlyAskedQuestions) {
      const questions = JSON.parse(recentAnalytics.frequentlyAskedQuestions);
      console.log('Questions found:', questions.length);
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`${i + 1}. ${q.question} (${q.count} times)`);
      });
    }
    
    console.log('\n✅ Conversation tracking test completed');
    
  } catch (error) {
    console.error('❌ Error testing conversation tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConversationTracking();
