/**
 * Cart Abandonment Detection for Jarvis Chatbot Widget
 * This script should be included in the chatbot widget to detect when customers
 * abandon their cart and trigger discount offers based on shop settings.
 */

class CartAbandonmentDetector {
  constructor(config = {}) {
    this.config = {
      checkInterval: 30000, // Check every 30 seconds
      apiEndpoint: config.apiEndpoint || '/apps/jarvis/api/cart-abandonment',
      shopDomain: config.shopDomain,
      debug: config.debug || false,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.cartState = {
      items: [],
      total: 0,
      lastUpdate: Date.now(),
      isEmpty: true
    };
    
    this.abandonment = {
      triggered: false,
      offerSent: false,
      timeoutId: null
    };
    
    this.init();
  }

  generateSessionId() {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(message, data = null) {
    if (this.config.debug) {
      console.log(`[CartAbandonmentDetector] ${message}`, data || '');
    }
  }

  init() {
    this.log('Initializing cart abandonment detector', {
      shopDomain: this.config.shopDomain,
      sessionId: this.sessionId
    });

    // Start monitoring cart changes
    this.startCartMonitoring();
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Listen for beforeunload (user leaving page)
    window.addEventListener('beforeunload', () => {
      this.handlePageLeave();
    });
  }

  startCartMonitoring() {
    setInterval(() => {
      this.checkCartState();
    }, this.config.checkInterval);

    // Also check immediately
    this.checkCartState();
  }

  async checkCartState() {
    try {
      // Get current cart state from Shopify
      const cart = await this.getCurrentCart();
      
      if (!cart) {
        this.log('Could not fetch cart data');
        return;
      }

      const wasEmpty = this.cartState.isEmpty;
      const currentTotal = this.calculateCartTotal(cart);
      
      // Update cart state
      this.cartState = {
        items: cart.items || [],
        total: currentTotal,
        lastUpdate: Date.now(),
        isEmpty: !cart.items || cart.items.length === 0
      };

      this.log('Cart state updated', {
        items: this.cartState.items.length,
        total: this.cartState.total,
        isEmpty: this.cartState.isEmpty
      });

      // If cart went from empty to having items, reset abandonment state
      if (wasEmpty && !this.cartState.isEmpty) {
        this.resetAbandonmentState();
      }

      // If cart has items and user interacted with chat, start abandonment detection
      if (!this.cartState.isEmpty && this.hasChatInteraction()) {
        this.startAbandonmentTimer();
      }

    } catch (error) {
      this.log('Error checking cart state:', error);
    }
  }

  async getCurrentCart() {
    try {
      // Try Shopify's cart.js first
      if (window.fetch) {
        const response = await fetch('/cart.js', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      }

      // Fallback to Shopify's global cart object
      if (window.Shopify && window.Shopify.cart) {
        return window.Shopify.cart;
      }

      // Last resort: try to find cart data in DOM
      return this.extractCartFromDOM();
      
    } catch (error) {
      this.log('Error fetching cart:', error);
      return null;
    }
  }

  extractCartFromDOM() {
    // Try to extract cart info from common DOM elements
    const cartElements = document.querySelectorAll('[data-cart-count], [data-cart-total], .cart-count, .cart-total');
    
    if (cartElements.length === 0) {
      return { items: [], total_price: 0 };
    }

    // This is a simplified extraction - would need to be customized per theme
    const cartCount = document.querySelector('[data-cart-count], .cart-count');
    const cartTotal = document.querySelector('[data-cart-total], .cart-total');
    
    const count = cartCount ? parseInt(cartCount.textContent || '0') : 0;
    const total = cartTotal ? this.parsePrice(cartTotal.textContent || '0') : 0;
    
    return {
      items: new Array(count).fill({ quantity: 1 }), // Simplified
      total_price: total * 100 // Convert to cents
    };
  }

  parsePrice(priceText) {
    // Extract numeric value from price text (e.g., "$19.99" -> 19.99)
    const match = priceText.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  calculateCartTotal(cart) {
    return cart.total_price || cart.total || 0;
  }

  hasChatInteraction() {
    // Check if user has interacted with the chatbot
    // This would be integrated with your chatbot widget
    const chatWidget = document.querySelector('[data-jarvis-chatbot], .jarvis-chatbot-widget');
    if (!chatWidget) return false;

    // Check if chat has been opened or has messages
    const hasMessages = chatWidget.querySelector('.chat-message, .message');
    const isOpen = chatWidget.classList.contains('open') || chatWidget.classList.contains('expanded');
    
    return hasMessages || isOpen;
  }

  startAbandonmentTimer() {
    if (this.abandonment.triggered || this.abandonment.offerSent) {
      return; // Already handled
    }

    // Clear existing timer
    if (this.abandonment.timeoutId) {
      clearTimeout(this.abandonment.timeoutId);
    }

    this.log('Starting abandonment timer');

    // Get delay from shop settings (would be passed from server)
    const delay = this.getAbandonmentDelay();
    
    this.abandonment.timeoutId = setTimeout(async () => {
      await this.handleCartAbandonment();
    }, delay * 1000);
  }

  getAbandonmentDelay() {
    // This would typically come from shop settings
    // For now, default to 5 minutes (300 seconds)
    return window.jarvisCartAbandonmentDelay || 300;
  }

  async handleCartAbandonment() {
    if (this.abandonment.offerSent || this.cartState.isEmpty) {
      return;
    }

    this.log('Handling cart abandonment', {
      cartTotal: this.cartState.total,
      sessionId: this.sessionId
    });

    this.abandonment.triggered = true;

    try {
      // Call the cart abandonment API
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          shop_domain: this.config.shopDomain,
          customer_id: this.getCustomerId(),
          cart_total: (this.cartState.total / 100).toFixed(2) // Convert cents to dollars
        })
      });

      const result = await response.json();

      if (result.success) {
        this.log('Cart abandonment offer generated', result);
        this.showDiscountOffer(result);
        this.abandonment.offerSent = true;
      } else {
        this.log('Cart abandonment API failed', result);
      }

    } catch (error) {
      this.log('Error calling cart abandonment API:', error);
    }
  }

  getCustomerId() {
    // Try to get customer ID from Shopify's customer object
    if (window.Shopify && window.Shopify.customer) {
      return window.Shopify.customer.id;
    }

    // Try to get from meta tags
    const customerMeta = document.querySelector('meta[name="shopify-customer-id"]');
    if (customerMeta) {
      return customerMeta.content;
    }

    return null; // Anonymous customer
  }

  showDiscountOffer(offerData) {
    this.log('Showing discount offer', offerData);

    // This would integrate with your chatbot widget to show the offer
    const chatWidget = document.querySelector('[data-jarvis-chatbot], .jarvis-chatbot-widget');
    
    if (chatWidget) {
      // Trigger chatbot to show the discount message
      const event = new CustomEvent('jarvis-show-discount', {
        detail: {
          discountCode: offerData.discount_code,
          discountPercentage: offerData.discount_percentage,
          message: offerData.message
        }
      });
      
      chatWidget.dispatchEvent(event);
    }

    // Also show as a notification/popup if chatbot is closed
    this.showDiscountNotification(offerData);
  }

  showDiscountNotification(offerData) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'jarvis-cart-abandonment-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00A651;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideInRight 0.3s ease-out;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">
          🎉 Special Discount for You!
        </div>
        <div style="margin-bottom: 8px; font-size: 14px;">
          ${offerData.message}
        </div>
        <div style="
          background: rgba(255,255,255,0.2);
          padding: 8px;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          margin-bottom: 8px;
        ">
          Code: ${offerData.discount_code}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          float: right;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        ">×</button>
      </div>
    `;

    // Add animation CSS
    if (!document.querySelector('#jarvis-cart-animations')) {
      const style = document.createElement('style');
      style.id = 'jarvis-cart-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  resetAbandonmentState() {
    this.log('Resetting abandonment state');
    
    if (this.abandonment.timeoutId) {
      clearTimeout(this.abandonment.timeoutId);
      this.abandonment.timeoutId = null;
    }
    
    this.abandonment.triggered = false;
    this.abandonment.offerSent = false;
  }

  handlePageHidden() {
    this.log('Page hidden - potential abandonment signal');
    // Could trigger faster abandonment detection
  }

  handlePageVisible() {
    this.log('Page visible again');
    // Reset any fast-track abandonment
  }

  handlePageLeave() {
    this.log('User leaving page');
    // Could trigger immediate abandonment offer for high-value carts
  }

  // Public API for manual triggering
  triggerAbandonmentCheck() {
    if (!this.cartState.isEmpty) {
      this.handleCartAbandonment();
    }
  }

  // Public API to get current state
  getState() {
    return {
      sessionId: this.sessionId,
      cartState: this.cartState,
      abandonment: this.abandonment
    };
  }
}

// Initialize cart abandonment detection when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Configuration would be injected by the server
  const config = {
    shopDomain: window.jarvisShopDomain || window.Shopify?.shop,
    debug: window.jarvisDebugMode || false,
    apiEndpoint: '/apps/jarvis/api/cart-abandonment'
  };

  if (config.shopDomain) {
    window.jarvisCartDetector = new CartAbandonmentDetector(config);
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartAbandonmentDetector;
}

// Global access
window.CartAbandonmentDetector = CartAbandonmentDetector;
