// Script to check and clean up any sample/fake data
const { PrismaClient } = require('@prisma/client');

async function cleanupFakeData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for sample/fake data...\n');
    
    // Check all conversations
    const allConversations = await prisma.chatConversation.findMany({
      include: {
        chatMessages: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`📊 Total conversations: ${allConversations.length}`);
    
    // Check for sample data patterns
    const sampleConversations = [];
    
    allConversations.forEach(conv => {
      const indicators = [];
      
      // Check for sample customer names
      if (conv.customerName && (
        conv.customerName.includes('Test') ||
        conv.customerName.includes('Sample') ||
        conv.customerName.includes('John Doe') ||
        conv.customerName.includes('Jane Doe') ||
        conv.customerName === 'Test Customer Live' ||
        conv.customerName.includes('Demo')
      )) {
        indicators.push('Sample customer name');
      }
      
      // Check for sample IP addresses or emails
      if (conv.customerIp && (
        conv.customerIp.includes('test') ||
        conv.customerIp.includes('sample') ||
        conv.customerIp.includes('demo') ||
        conv.customerIp === 'anonymous@shop.local'
      )) {
        indicators.push('Sample IP/email');
      }
      
      // Check for test session IDs
      if (conv.sessionId && (
        conv.sessionId.includes('test') ||
        conv.sessionId.includes('sample') ||
        conv.sessionId.includes('demo')
      )) {
        indicators.push('Test session ID');
      }
      
      if (indicators.length > 0) {
        sampleConversations.push({
          conversation: conv,
          indicators
        });
      }
    });
    
    console.log(`\n🧪 Found ${sampleConversations.length} conversations with sample data indicators:`);
    
    sampleConversations.forEach((item, index) => {
      const conv = item.conversation;
      console.log(`\n${index + 1}. Conversation ID: ${conv.id}`);
      console.log(`   Shop: ${conv.shopDomain}`);
      console.log(`   Customer: ${conv.customerName || 'N/A'}`);
      console.log(`   Topic: ${conv.topic}`);
      console.log(`   Messages: ${conv.chatMessages.length}`);
      console.log(`   Created: ${conv.startTime}`);
      console.log(`   Sample indicators: ${item.indicators.join(', ')}`);
    });
    
    // Check analytics metrics for today
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = await prisma.analyticsMetrics.findMany({
      where: {
        date: {
          gte: new Date(today)
        }
      }
    });
    
    console.log(`\n📈 Today's analytics metrics: ${todayMetrics.length} records`);
    todayMetrics.forEach(metric => {
      console.log(`   Shop: ${metric.shopDomain}`);
      console.log(`   Conversations: ${metric.totalConversations}`);
      console.log(`   Visitors: ${metric.uniqueVisitors}`);
      console.log(`   Messages: ${metric.totalMessages}`);
    });
    
    // Check for conversations from your test shop
    const realShopDomain = 'aman-chatbot-test.myshopify.com';
    const realShopConversations = allConversations.filter(conv => 
      conv.shopDomain === realShopDomain
    );
    
    console.log(`\n🏪 Real shop (${realShopDomain}) conversations: ${realShopConversations.length}`);
    
    const realConversationsToday = realShopConversations.filter(conv => {
      const convDate = conv.startTime.toISOString().split('T')[0];
      return convDate === today;
    });
    
    console.log(`📅 Today's real conversations: ${realConversationsToday.length}`);
    
    if (realConversationsToday.length > 0) {
      console.log('\n📝 Today\'s real conversations:');
      realConversationsToday.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.topic} - ${conv.chatMessages.length} messages`);
        if (conv.chatMessages.length > 0) {
          const firstMessage = conv.chatMessages[0].content;
          console.log(`      First message: "${firstMessage.substring(0, 50)}..."`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupFakeData();
