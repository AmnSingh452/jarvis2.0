const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAnalyticsData() {
  try {
    console.log('🌱 Starting analytics data seeding...');
    
    const shopDomain = 'aman-chatbot-test.myshopify.com';
    
    // Create sample conversations
    console.log('📝 Creating sample conversations...');
    
    const conversations = await Promise.all([
      // Conversation 1 - Converted
      prisma.chatConversation.create({
        data: {
          shopDomain,
          customerName: 'Sarah Mitchell',
          customerIp: '192.168.1.100',
          sessionId: 'session_001',
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes later
          totalMessages: 8,
          customerSatisfaction: 5.0,
          converted: true,
          conversionValue: 89.99,
          topic: 'Shipping',
          status: 'completed'
        }
      }),
      
      // Conversation 2 - Active
      prisma.chatConversation.create({
        data: {
          shopDomain,
          customerName: 'Mike Rodriguez',
          customerIp: '192.168.1.101',
          sessionId: 'session_002',
          startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          totalMessages: 3,
          customerSatisfaction: 4.5,
          converted: false,
          topic: 'Product',
          status: 'active'
        }
      }),
      
      // Conversation 3 - Converted
      prisma.chatConversation.create({
        data: {
          shopDomain,
          customerName: 'Emma Johnson',
          customerIp: '192.168.1.102',
          sessionId: 'session_003',
          startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8 minutes later
          totalMessages: 12,
          customerSatisfaction: 4.8,
          converted: true,
          conversionValue: 134.50,
          topic: 'Returns',
          status: 'completed'
        }
      }),
      
      // Conversation 4 - Resolved
      prisma.chatConversation.create({
        data: {
          shopDomain,
          customerName: 'John Davis',
          customerIp: '192.168.1.103',
          sessionId: 'session_004',
          startTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          endTime: new Date(Date.now() - 8 * 60 * 60 * 1000 + 3 * 60 * 1000), // 3 minutes later
          totalMessages: 6,
          customerSatisfaction: 4.2,
          converted: false,
          topic: 'Payment',
          status: 'completed'
        }
      }),
      
      // Conversation 5 - Converted
      prisma.chatConversation.create({
        data: {
          shopDomain,
          customerName: 'Lisa Chen',
          customerIp: '192.168.1.104',
          sessionId: 'session_005',
          startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 1000), // 6 minutes later
          totalMessages: 10,
          customerSatisfaction: 4.9,
          converted: true,
          conversionValue: 67.25,
          topic: 'Stock',
          status: 'completed'
        }
      })
    ]);
    
    console.log(`✅ Created ${conversations.length} sample conversations`);
    
    // Create sample messages for each conversation
    console.log('💬 Creating sample messages...');
    
    const messagePromises = [];
    
    // Messages for Conversation 1 (Sarah - Shipping)
    messagePromises.push(
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[0].id,
          role: 'user',
          content: 'Hi, what are your shipping options?',
          timestamp: conversations[0].startTime,
          responseTime: null
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[0].id,
          role: 'assistant',
          content: 'Hello! We offer free standard shipping (5-7 days) on orders over $50, and express shipping (2-3 days) for $9.99. Which would you prefer?',
          timestamp: new Date(conversations[0].startTime.getTime() + 30000), // 30 seconds later
          responseTime: 1.2
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[0].id,
          role: 'user',
          content: 'That sounds great! My order is $89.99 so I get free shipping right?',
          timestamp: new Date(conversations[0].startTime.getTime() + 120000), // 2 minutes later
          responseTime: null
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[0].id,
          role: 'assistant',
          content: 'Yes, absolutely! Your order qualifies for free standard shipping. Would you like me to help you complete your purchase?',
          timestamp: new Date(conversations[0].startTime.getTime() + 140000), // 20 seconds later
          responseTime: 0.8
        }
      })
    );
    
    // Messages for Conversation 2 (Mike - Product)
    messagePromises.push(
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[1].id,
          role: 'user',
          content: 'Tell me about the features of this product',
          timestamp: conversations[1].startTime,
          responseTime: null
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[1].id,
          role: 'assistant',
          content: 'I\'d be happy to help! Could you tell me which specific product you\'re interested in?',
          timestamp: new Date(conversations[1].startTime.getTime() + 25000), // 25 seconds later
          responseTime: 1.5
        }
      })
    );
    
    // Messages for Conversation 3 (Emma - Returns)
    messagePromises.push(
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[2].id,
          role: 'user',
          content: 'How do I return an item?',
          timestamp: conversations[2].startTime,
          responseTime: null
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[2].id,
          role: 'assistant',
          content: 'Returns are easy! You have 30 days from delivery. Just go to your order history and click "Return Item". We provide a free return label.',
          timestamp: new Date(conversations[2].startTime.getTime() + 20000), // 20 seconds later
          responseTime: 0.9
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[2].id,
          role: 'user',
          content: 'Perfect! Can I exchange for a different size instead?',
          timestamp: new Date(conversations[2].startTime.getTime() + 180000), // 3 minutes later
          responseTime: null
        }
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversations[2].id,
          role: 'assistant',
          content: 'Yes! Size exchanges are free within 30 days. I can help you start that process right now.',
          timestamp: new Date(conversations[2].startTime.getTime() + 195000), // 15 seconds later
          responseTime: 1.1
        }
      })
    );
    
    await Promise.all(messagePromises);
    console.log(`✅ Created sample messages for conversations`);
    
    // Create daily analytics metrics
    console.log('📊 Creating daily analytics metrics...');
    
    const today = new Date();
    const metricsPromises = [];
    
    // Create metrics for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayMetrics = {
        shopDomain,
        date,
        totalConversations: Math.floor(Math.random() * 20) + 15, // 15-35 conversations
        uniqueVisitors: Math.floor(Math.random() * 50) + 30, // 30-80 visitors
        totalMessages: Math.floor(Math.random() * 100) + 50, // 50-150 messages
        averageResponseTime: parseFloat((Math.random() * 2 + 0.5).toFixed(1)), // 0.5-2.5 seconds
        conversions: Math.floor(Math.random() * 8) + 2, // 2-10 conversions
        revenue: parseFloat((Math.random() * 800 + 200).toFixed(2)), // $200-$1000
        customerSatisfaction: parseFloat((Math.random() * 1 + 4).toFixed(1)), // 4.0-5.0
        topQuestions: [
          { question: "What are your shipping options?", count: Math.floor(Math.random() * 10) + 5 },
          { question: "How do I return an item?", count: Math.floor(Math.random() * 8) + 3 },
          { question: "Is this item in stock?", count: Math.floor(Math.random() * 6) + 2 },
          { question: "What payment methods do you accept?", count: Math.floor(Math.random() * 5) + 1 },
          { question: "Can I track my order?", count: Math.floor(Math.random() * 4) + 1 }
        ]
      };
      
      metricsPromises.push(
        prisma.analyticsMetrics.create({ data: dayMetrics })
      );
    }
    
    await Promise.all(metricsPromises);
    console.log(`✅ Created 7 days of sample analytics metrics`);
    
    // Display summary
    console.log('\n🎉 Analytics data seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`- ${conversations.length} sample conversations created`);
    console.log(`- Multiple chat messages with realistic content`);
    console.log(`- 7 days of daily analytics metrics`);
    console.log(`- Mix of converted and non-converted interactions`);
    console.log(`- Customer satisfaction scores and response times`);
    console.log('\n✨ Your analytics dashboard is now ready with sample data!');
    
  } catch (error) {
    console.error('❌ Error seeding analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedAnalyticsData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAnalyticsData };
