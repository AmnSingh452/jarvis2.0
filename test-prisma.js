// Simple analytics test
const test = async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('Testing Prisma connection...');
    
    // Test if we can query shops
    const shops = await prisma.shop.findMany({ take: 1 });
    console.log('✅ Prisma connected, shops found:', shops.length);
    
    await prisma.$disconnect();
    console.log('✅ Test complete');
  } catch (error) {
    console.error('❌ Prisma test failed:', error);
  }
};

test();
