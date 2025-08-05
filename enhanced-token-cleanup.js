/**
 * Enhanced Token and Session Cleanup System for Shopify App
 * 
 * This script addresses the core issues:
 * 1. Wrong/stale tokens persisting after app uninstallation
 * 2. Session data remaining in database when app is uninstalled
 * 3. No fresh tokens generated on reinstallation
 * 4. Current tokens not working properly
 * 
 * USAGE:
 * 1. For manual cleanup: node enhanced-token-cleanup.js cleanup [shop-domain]
 * 2. For verification: node enhanced-token-cleanup.js verify [shop-domain]
 * 3. For fresh install: node enhanced-token-cleanup.js fresh-install [shop-domain]
 */

import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

class TokenCleanupService {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Comprehensive cleanup for app uninstallation
   * This should be called from the uninstall webhook
   */
  async cleanupOnUninstall(shopDomain) {
    console.log(`🧹 Starting comprehensive cleanup for shop: ${shopDomain}`);
    
    try {
      // 1. Delete ALL sessions for this shop (including expired ones)
      const deletedSessions = await this.prisma.session.deleteMany({
        where: {
          shop: shopDomain
        }
      });
      console.log(`✅ Deleted ${deletedSessions.count} sessions for ${shopDomain}`);

      // 2. Update shop record - mark as inactive and clear access token
      const updatedShop = await this.prisma.shop.updateMany({
        where: {
          shopDomain: shopDomain
        },
        data: {
          isActive: false,
          uninstalledAt: new Date(),
          accessToken: null, // Clear the access token
          tokenVersion: { increment: 1 } // Increment version to invalidate any cached tokens
        }
      });
      console.log(`✅ Updated ${updatedShop.count} shop records for ${shopDomain}`);

      // 3. Cancel any active subscriptions
      const cancelledSubscriptions = await this.prisma.subscription.updateMany({
        where: {
          shopDomain: shopDomain,
          status: { in: ['active', 'trialing'] }
        },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });
      console.log(`✅ Cancelled ${cancelledSubscriptions.count} subscriptions for ${shopDomain}`);

      // 4. Log the uninstallation
      await this.prisma.installationLog.create({
        data: {
          shopDomain: shopDomain,
          action: 'UNINSTALLED_CLEANUP',
          metadata: {
            timestamp: new Date().toISOString(),
            sessionsDeleted: deletedSessions.count,
            shopsUpdated: updatedShop.count,
            subscriptionsCancelled: cancelledSubscriptions.count,
            cleanupVersion: '2.0'
          }
        }
      });

      console.log(`🎉 Comprehensive cleanup completed for ${shopDomain}`);
      return {
        success: true,
        sessionsDeleted: deletedSessions.count,
        shopsUpdated: updatedShop.count,
        subscriptionsCancelled: cancelledSubscriptions.count
      };

    } catch (error) {
      console.error(`❌ Error during cleanup for ${shopDomain}:`, error);
      throw error;
    }
  }

  /**
   * Prepare for fresh installation
   * This ensures clean slate for reinstallation
   */
  async prepareForFreshInstall(shopDomain) {
    console.log(`🆕 Preparing fresh installation for shop: ${shopDomain}`);
    
    try {
      // 1. Complete cleanup first
      await this.cleanupOnUninstall(shopDomain);

      // 2. Delete old shop records entirely (optional - for truly fresh start)
      const deletedShops = await this.prisma.shop.deleteMany({
        where: {
          shopDomain: shopDomain,
          isActive: false
        }
      });
      console.log(`✅ Deleted ${deletedShops.count} old shop records for ${shopDomain}`);

      // 3. Clear widget settings (reset to defaults on reinstall)
      const deletedSettings = await this.prisma.widgetSettings.deleteMany({
        where: {
          shopDomain: shopDomain
        }
      });
      console.log(`✅ Deleted ${deletedSettings.count} widget settings for ${shopDomain}`);

      // 4. Log fresh install preparation
      await this.prisma.installationLog.create({
        data: {
          shopDomain: shopDomain,
          action: 'FRESH_INSTALL_PREP',
          metadata: {
            timestamp: new Date().toISOString(),
            shopsDeleted: deletedShops.count,
            settingsDeleted: deletedSettings.count,
            prepVersion: '2.0'
          }
        }
      });

      console.log(`🎉 Fresh installation preparation completed for ${shopDomain}`);
      return {
        success: true,
        shopsDeleted: deletedShops.count,
        settingsDeleted: deletedSettings.count
      };

    } catch (error) {
      console.error(`❌ Error during fresh install prep for ${shopDomain}:`, error);
      throw error;
    }
  }

  /**
   * Verify current state of shop
   * Use this to debug token/session issues
   */
  async verifyShopState(shopDomain) {
    console.log(`🔍 Verifying state for shop: ${shopDomain}`);
    
    try {
      // Check sessions
      const sessions = await this.prisma.session.findMany({
        where: { shop: shopDomain },
        orderBy: { createdAt: 'desc' }
      });

      // Check shop records
      const shops = await this.prisma.shop.findMany({
        where: { shopDomain: shopDomain },
        orderBy: { installedAt: 'desc' }
      });

      // Check subscriptions
      const subscriptions = await this.prisma.subscription.findMany({
        where: { shopDomain: shopDomain },
        orderBy: { createdAt: 'desc' }
      });

      // Check widget settings
      const settings = await this.prisma.widgetSettings.findMany({
        where: { shopDomain: shopDomain }
      });

      // Check installation logs
      const logs = await this.prisma.installationLog.findMany({
        where: { shopDomain: shopDomain },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      const report = {
        shopDomain,
        timestamp: new Date().toISOString(),
        sessions: {
          count: sessions.length,
          active: sessions.filter(s => !s.expires || s.expires > new Date()).length,
          expired: sessions.filter(s => s.expires && s.expires <= new Date()).length,
          latest: sessions[0] ? {
            id: sessions[0].id,
            created: sessions[0].createdAt,
            expires: sessions[0].expires,
            isOnline: sessions[0].isOnline
          } : null
        },
        shops: {
          count: shops.length,
          active: shops.filter(s => s.isActive).length,
          inactive: shops.filter(s => !s.isActive).length,
          latest: shops[0] ? {
            id: shops[0].id,
            installed: shops[0].installedAt,
            uninstalled: shops[0].uninstalledAt,
            isActive: shops[0].isActive,
            tokenVersion: shops[0].tokenVersion,
            hasAccessToken: !!shops[0].accessToken
          } : null
        },
        subscriptions: {
          count: subscriptions.length,
          active: subscriptions.filter(s => s.status === 'active').length,
          cancelled: subscriptions.filter(s => s.status === 'cancelled').length
        },
        settings: {
          count: settings.length,
          enabled: settings.filter(s => s.isEnabled).length
        },
        recentLogs: logs.map(log => ({
          action: log.action,
          timestamp: log.timestamp,
          metadata: log.metadata
        }))
      };

      console.log('\n📊 Shop State Report:');
      console.log(JSON.stringify(report, null, 2));

      // Identify issues
      const issues = [];
      if (report.sessions.count > 1) {
        issues.push(`Multiple sessions found (${report.sessions.count})`);
      }
      if (report.sessions.expired > 0) {
        issues.push(`Expired sessions present (${report.sessions.expired})`);
      }
      if (report.shops.count > 1) {
        issues.push(`Multiple shop records found (${report.shops.count})`);
      }
      if (report.shops.active > 0 && report.sessions.active === 0) {
        issues.push('Active shop but no active sessions');
      }
      if (report.shops.latest && !report.shops.latest.hasAccessToken) {
        issues.push('Shop missing access token');
      }

      if (issues.length > 0) {
        console.log('\n⚠️ Issues Found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
        console.log('\n💡 Recommendation: Run cleanup and fresh install preparation');
      } else {
        console.log('\n✅ No issues detected');
      }

      return report;

    } catch (error) {
      console.error(`❌ Error verifying shop state for ${shopDomain}:`, error);
      throw error;
    }
  }

  /**
   * Emergency cleanup - removes ALL data for a shop
   * Use with caution!
   */
  async emergencyCleanup(shopDomain) {
    console.log(`🚨 EMERGENCY CLEANUP for shop: ${shopDomain}`);
    console.log('⚠️ This will permanently delete ALL data for this shop!');
    
    try {
      const results = {
        sessions: 0,
        shops: 0,
        subscriptions: 0,
        payments: 0,
        settings: 0,
        logs: 0
      };

      // Delete in correct order to respect foreign key constraints
      
      // 1. Delete payments first
      const deletedPayments = await this.prisma.payment.deleteMany({
        where: {
          subscription: {
            shopDomain: shopDomain
          }
        }
      });
      results.payments = deletedPayments.count;

      // 2. Delete subscriptions
      const deletedSubscriptions = await this.prisma.subscription.deleteMany({
        where: { shopDomain: shopDomain }
      });
      results.subscriptions = deletedSubscriptions.count;

      // 3. Delete sessions
      const deletedSessions = await this.prisma.session.deleteMany({
        where: { shop: shopDomain }
      });
      results.sessions = deletedSessions.count;

      // 4. Delete widget settings
      const deletedSettings = await this.prisma.widgetSettings.deleteMany({
        where: { shopDomain: shopDomain }
      });
      results.settings = deletedSettings.count;

      // 5. Delete shops
      const deletedShops = await this.prisma.shop.deleteMany({
        where: { shopDomain: shopDomain }
      });
      results.shops = deletedShops.count;

      // 6. Delete installation logs (keep for audit trail - comment out if needed)
      // const deletedLogs = await this.prisma.installationLog.deleteMany({
      //   where: { shopDomain: shopDomain }
      // });
      // results.logs = deletedLogs.count;

      // Log the emergency cleanup
      await this.prisma.installationLog.create({
        data: {
          shopDomain: shopDomain,
          action: 'EMERGENCY_CLEANUP',
          metadata: {
            timestamp: new Date().toISOString(),
            deletedCounts: results,
            cleanupVersion: '2.0'
          }
        }
      });

      console.log(`🎉 Emergency cleanup completed for ${shopDomain}:`);
      console.log(`  - Sessions deleted: ${results.sessions}`);
      console.log(`  - Shops deleted: ${results.shops}`);
      console.log(`  - Subscriptions deleted: ${results.subscriptions}`);
      console.log(`  - Payments deleted: ${results.payments}`);
      console.log(`  - Settings deleted: ${results.settings}`);

      return results;

    } catch (error) {
      console.error(`❌ Error during emergency cleanup for ${shopDomain}:`, error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const shopDomain = args[1];

  if (!command) {
    console.log(`
🛠️ Enhanced Token Cleanup System

Commands:
  verify [shop-domain]       - Verify current state of shop
  cleanup [shop-domain]      - Cleanup tokens and sessions for uninstalled shop
  fresh-install [shop-domain] - Prepare for fresh installation
  emergency [shop-domain]    - Emergency cleanup (deletes ALL data)

Examples:
  node enhanced-token-cleanup.js verify aman-chatbot-test.myshopify.com
  node enhanced-token-cleanup.js cleanup aman-chatbot-test.myshopify.com
  node enhanced-token-cleanup.js fresh-install aman-chatbot-test.myshopify.com
    `);
    process.exit(1);
  }

  if (!shopDomain) {
    console.error('❌ Shop domain is required');
    process.exit(1);
  }

  const service = new TokenCleanupService();

  try {
    switch (command) {
      case 'verify':
        await service.verifyShopState(shopDomain);
        break;
      
      case 'cleanup':
        await service.cleanupOnUninstall(shopDomain);
        break;
      
      case 'fresh-install':
        await service.prepareForFreshInstall(shopDomain);
        break;
      
      case 'emergency':
        console.log('⚠️ Emergency cleanup will delete ALL data for this shop!');
        console.log('This action cannot be undone.');
        // In production, you might want to add a confirmation prompt here
        await service.emergencyCleanup(shopDomain);
        break;
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in webhooks
export { TokenCleanupService };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
