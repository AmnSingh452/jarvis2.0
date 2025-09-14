/**
 * Jarvis Analytics SDK
 * For integrating with Shopify chatbot widgets to track conversations and analytics
 */

class JarvisAnalytics {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'https://jarvis2-0-djg1.onrender.com';
    this.shopDomain = options.shopDomain;
    this.sessionId = this.generateSessionId();
    this.conversationStarted = false;
    this.messageCount = 0;
    
    // Debug mode
    this.debug = options.debug || false;
    
    this.log('🚀 Jarvis Analytics SDK initialized', {
      shopDomain: this.shopDomain,
      sessionId: this.sessionId
    });
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[JarvisAnalytics] ${message}`, data);
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async makeRequest(endpoint, method = 'POST', data = null) {
    try {
      const url = `${this.apiBaseUrl}/api/${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors'
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      this.log(`❌ API Error (${endpoint}):`, error.message);
      // Don't throw - we don't want analytics to break the chatbot
      return { success: false, error: error.message };
    }
  }

  /**
   * Track a unique visitor
   */
  async trackVisitor() {
    this.log('👤 Tracking visitor');
    
    return await this.makeRequest('analytics-event', 'POST', {
      eventType: 'visitor',
      shopDomain: this.shopDomain,
      sessionId: this.sessionId
    });
  }

  /**
   * Start a new conversation
   */
  async startConversation(customerData = {}) {
    if (this.conversationStarted) {
      this.log('⚠️ Conversation already started');
      return;
    }

    this.log('🗣️ Starting conversation');
    this.conversationStarted = true;

    // Track the conversation start
    const sessionResult = await this.makeRequest('chat-session', 'POST', {
      action: 'start',
      sessionId: this.sessionId,
      shopDomain: this.shopDomain,
      customerIp: customerData.ip || this.getClientIP(),
      customerName: customerData.name,
      topic: customerData.topic || 'General'
    });

    // Track analytics event
    await this.makeRequest('analytics-event', 'POST', {
      eventType: 'conversation_start',
      shopDomain: this.shopDomain,
      sessionId: this.sessionId
    });

    return sessionResult;
  }

  /**
   * Track a message in the conversation
   */
  async trackMessage(role, content, responseTime = null) {
    if (!this.conversationStarted) {
      await this.startConversation();
    }

    this.log(`💬 Tracking ${role} message`);
    this.messageCount++;

    // Save the message
    const messageResult = await this.makeRequest('chat-message', 'POST', {
      sessionId: this.sessionId,
      role,
      content,
      responseTime
    });

    // Track analytics event
    await this.makeRequest('analytics-event', 'POST', {
      eventType: 'message',
      shopDomain: this.shopDomain,
      sessionId: this.sessionId,
      data: { responseTime }
    });

    // Track question if it's from user
    if (role === 'user' && content) {
      await this.makeRequest('analytics-event', 'POST', {
        eventType: 'question',
        shopDomain: this.shopDomain,
        sessionId: this.sessionId,
        data: { question: content.substring(0, 100) } // Limit question length
      });
    }

    return messageResult;
  }

  /**
   * Track user message
   */
  async trackUserMessage(content) {
    return await this.trackMessage('user', content);
  }

  /**
   * Track assistant message with response time
   */
  async trackAssistantMessage(content, responseTime) {
    return await this.trackMessage('assistant', content, responseTime);
  }

  /**
   * Track a conversion
   */
  async trackConversion(value = null, details = {}) {
    this.log('🎯 Tracking conversion', { value, details });

    // Update conversation
    await this.makeRequest('chat-session', 'POST', {
      action: 'update',
      sessionId: this.sessionId,
      converted: true,
      conversionValue: value,
      topic: details.topic
    });

    // Track analytics event
    await this.makeRequest('analytics-event', 'POST', {
      eventType: 'conversion',
      shopDomain: this.shopDomain,
      sessionId: this.sessionId,
      data: { value, details }
    });
  }

  /**
   * Track customer satisfaction
   */
  async trackSatisfaction(rating, feedback = null) {
    this.log('⭐ Tracking satisfaction', { rating, feedback });

    // Update conversation
    await this.makeRequest('chat-session', 'POST', {
      action: 'update',
      sessionId: this.sessionId,
      customerSatisfaction: rating
    });

    // Track analytics event
    await this.makeRequest('analytics-event', 'POST', {
      eventType: 'satisfaction',
      shopDomain: this.shopDomain,
      sessionId: this.sessionId,
      data: { rating, feedback }
    });
  }

  /**
   * End the conversation
   */
  async endConversation(finalData = {}) {
    if (!this.conversationStarted) {
      this.log('⚠️ No conversation to end');
      return;
    }

    this.log('🏁 Ending conversation');

    return await this.makeRequest('chat-session', 'POST', {
      action: 'end',
      sessionId: this.sessionId,
      customerSatisfaction: finalData.satisfaction,
      converted: finalData.converted,
      conversionValue: finalData.conversionValue
    });
  }

  /**
   * Get client IP (best effort)
   */
  getClientIP() {
    // This is a simple approach - in production you'd want more sophisticated IP detection
    return 'unknown';
  }

  /**
   * Batch sync historical data
   */
  async syncBulkData(conversations, dailyMetrics) {
    this.log('📦 Syncing bulk data', {
      conversations: conversations?.length,
      metrics: dailyMetrics?.length
    });

    return await this.makeRequest('bulk-sync', 'POST', {
      shopDomain: this.shopDomain,
      conversations,
      dailyMetrics
    });
  }
}

// Usage examples and integration guide
window.JarvisAnalytics = JarvisAnalytics;

/* 
INTEGRATION EXAMPLES:

// 1. Initialize the SDK
const analytics = new JarvisAnalytics({
  shopDomain: 'your-shop.myshopify.com',
  debug: true // Enable for development
});

// 2. Track visitor when widget loads
analytics.trackVisitor();

// 3. Start conversation when user sends first message
analytics.startConversation({
  name: 'John Doe', // if known
  topic: 'Product Question'
});

// 4. Track messages
analytics.trackUserMessage('What are your shipping options?');

// Track bot response with timing
const startTime = Date.now();
// ... bot processes response ...
const responseTime = (Date.now() - startTime) / 1000;
analytics.trackAssistantMessage('We offer free shipping on orders over $50...', responseTime);

// 5. Track conversions
analytics.trackConversion(89.99, { 
  product: 'Widget Pro',
  type: 'purchase'
});

// 6. Track satisfaction
analytics.trackSatisfaction(5, 'Very helpful!');

// 7. End conversation
analytics.endConversation({
  satisfaction: 5,
  converted: true,
  conversionValue: 89.99
});

*/
