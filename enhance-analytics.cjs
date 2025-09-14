const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMoreSampleData() {
  try {
    console.log('🚀 Adding more impressive sample data...');
    
    const shopDomain = 'aman-chatbot-test.myshopify.com';
    
    // Create more high-value conversations
    const highValueConversations = [
      {
        customerName: 'Robert Wilson',
        customerIp: '192.168.1.105',
        sessionId: 'session_006',
        startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000), // 12 minutes later
        totalMessages: 18,
        customerSatisfaction: 4.9,
        converted: true,
        conversionValue: 245.99,
        topic: 'Product',
        status: 'completed'
      },
      {
        customerName: 'Amanda Garcia',
        customerIp: '192.168.1.106',
        sessionId: 'session_007',
        startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8 minutes later
        totalMessages: 14,
        customerSatisfaction: 5.0,
        converted: true,
        conversionValue: 189.50,
        topic: 'Shipping',
        status: 'completed'
      },
      {
        customerName: 'David Chen',
        customerIp: '192.168.1.107',
        sessionId: 'session_008',
        startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        endTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 minutes later
        totalMessages: 22,
        customerSatisfaction: 4.8,
        converted: true,
        conversionValue: 312.75,
        topic: 'Product',
        status: 'completed'
      },
      {
        customerName: 'Jennifer Taylor',
        customerIp: '192.168.1.108',
        sessionId: 'session_009',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        totalMessages: 5,
        customerSatisfaction: 4.6,
        converted: false,
        topic: 'Stock',
        status: 'active'
      },
      {
        customerName: 'Mark Thompson',
        customerIp: '192.168.1.109',
        sessionId: 'session_010',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000), // 10 minutes later
        totalMessages: 16,
        customerSatisfaction: 4.9,
        converted: true,
        conversionValue: 156.25,
        topic: 'Payment',
        status: 'completed'
      }
    ];
    
    const newConversations = await Promise.all(
      highValueConversations.map(conv => 
        prisma.chatConversation.create({ data: { ...conv, shopDomain } })
      )
    );
    
    console.log(`✅ Created ${newConversations.length} high-value conversations`);
    
    // Update existing metrics to be more impressive
    const existingMetrics = await prisma.analyticsMetrics.findMany({
      where: { shopDomain }
    });
    
    for (const metric of existingMetrics) {
      await prisma.analyticsMetrics.update({
        where: { id: metric.id },
        data: {
          totalConversations: metric.totalConversations + Math.floor(Math.random() * 15) + 10, // Add 10-25 more
          uniqueVisitors: metric.uniqueVisitors + Math.floor(Math.random() * 25) + 15, // Add 15-40 more
          totalMessages: metric.totalMessages + Math.floor(Math.random() * 50) + 30, // Add 30-80 more
          conversions: metric.conversions + Math.floor(Math.random() * 5) + 3, // Add 3-8 more
          revenue: metric.revenue + Math.floor(Math.random() * 400) + 200, // Add $200-600 more
          customerSatisfaction: Math.max(4.2, Math.min(5.0, metric.customerSatisfaction + Math.random() * 0.3)) // Improve satisfaction
        }
      });
    }
    
    console.log(`✅ Enhanced ${existingMetrics.length} daily metrics for better presentation`);
    
    // Add some recent high-activity data for "today"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMetric = await prisma.analyticsMetrics.upsert({
      where: {
        shopDomain_date: {
          shopDomain,
          date: today
        }
      },
      update: {
        totalConversations: 45,
        uniqueVisitors: 89,
        totalMessages: 156,
        averageResponseTime: 1.1,
        conversions: 12,
        revenue: 1890.50,
        customerSatisfaction: 4.8,
        topQuestions: [
          { question: "What are your shipping options?", count: 18 },
          { question: "How do I return an item?", count: 14 },
          { question: "Is this item in stock?", count: 12 },
          { question: "What payment methods do you accept?", count: 8 },
          { question: "Can I track my order?", count: 6 }
        ]
      },
      create: {
        shopDomain,
        date: today,
        totalConversations: 45,
        uniqueVisitors: 89,
        totalMessages: 156,
        averageResponseTime: 1.1,
        conversions: 12,
        revenue: 1890.50,
        customerSatisfaction: 4.8,
        topQuestions: [
          { question: "What are your shipping options?", count: 18 },
          { question: "How do I return an item?", count: 14 },
          { question: "Is this item in stock?", count: 12 },
          { question: "What payment methods do you accept?", count: 8 },
          { question: "Can I track my order?", count: 6 }
        ]
      }
    });
    
    console.log('✅ Added impressive "today" metrics');
    
    // Summary
    const totalConversations = await prisma.chatConversation.count({ where: { shopDomain } });
    const totalMessages = await prisma.chatMessage.count();
    const totalConversions = await prisma.chatConversation.count({ 
      where: { shopDomain, converted: true }
    });
    const totalRevenue = await prisma.chatConversation.aggregate({
      where: { shopDomain, converted: true },
      _sum: { conversionValue: true }
    });
    
    console.log('\n🎉 Enhanced analytics data completed!');
    console.log('\n📊 Final Summary:');
    console.log(`- Total Conversations: ${totalConversations}`);
    console.log(`- Total Messages: ${totalMessages}`);
    console.log(`- Total Conversions: ${totalConversions}`);
    console.log(`- Direct Conversion Revenue: $${totalRevenue._sum.conversionValue || 0}`);
    console.log(`- Conversion Rate: ${((totalConversions / totalConversations) * 100).toFixed(1)}%`);
    
    console.log('\n🚀 Your analytics dashboard is now ready to impress clients!');
    
  } catch (error) {
    console.error('❌ Error enhancing analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the enhancement function
if (require.main === module) {
  addMoreSampleData()
    .then(() => {
      console.log('✅ Enhancement completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Enhancement failed:', error);
      process.exit(1);
    });
}

module.exports = { addMoreSampleData };
