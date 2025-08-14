# Analytics Integration Guide

## Widget Tracking Integration

Add this analytics tracking code to your widget JavaScript file (`shopify_chatbot_widget.js`):

### 1. Add Analytics Session Variable

After the existing variables, add:
```javascript
const API_URLS = getApiUrls();
let sessionId = localStorage.getItem('shopifyChatbotSessionId') || null;
let customerName = localStorage.getItem('shopifyChatbotCustomerName') || null;
let analyticsSessionId = null; // For tracking conversation sessions
```

### 2. Add Analytics Tracking Helper Function

Add this function anywhere in your widget file:
```javascript
// Analytics tracking helper
async function trackAnalyticsEvent(eventType, data = {}) {
    if (!window.SHOP_DOMAIN && !SHOP_DOMAIN) {
        console.warn('⚠️ Analytics: Shop domain not available for tracking');
        return;
    }

    const shopDomain = window.SHOP_DOMAIN || SHOP_DOMAIN;
    
    try {
        const payload = {
            type: eventType,
            shopDomain: shopDomain,
            sessionId: analyticsSessionId,
            timestamp: new Date().toISOString(),
            ...data
        };

        console.log('📊 Analytics Event:', eventType, payload);

        const response = await fetch(`${JARVIS_API_URL}/api/analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn('⚠️ Analytics tracking failed:', response.status);
        }
    } catch (error) {
        console.warn('⚠️ Analytics tracking error:', error);
    }
}

//git branch check


// Generate unique session ID for analytics
function generateAnalyticsSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}
```

### 3. Track Chat Widget Opening

In your chat toggle button event listener, add tracking:
```javascript
chatToggleButton.addEventListener('click', () => {
    chatWindow.classList.toggle('chat-window-hidden');
    if (!chatWindow.classList.contains('chat-window-hidden')) {
        // Generate new analytics session if needed
        if (!analyticsSessionId) {
            analyticsSessionId = generateAnalyticsSessionId();
            
            // Track conversation started
            trackAnalyticsEvent('conversation_started', {
                customerName: customerName || 'Anonymous',
                source: 'widget_button'
            });
        }
        
        loadChatHistory();
        chatInput.focus();
        checkCartAndPrompt();
    }
});
```

### 4. Track Message Sending

In your `sendMessage()` function, add tracking after the API call:
```javascript
async function sendMessage() {
    const message = document.getElementById('chat-input')?.value?.trim();
    const chatMessages = document.getElementById('chat-messages');
    if (!message) return;
    
    // ... existing code ...
    
    const messageStartTime = Date.now();
    
    try {
        // ... existing API call code ...
        
        const response = await fetch(API_URLS.chat, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        const responseTime = Date.now() - messageStartTime;
        
        // Track message sent with response time
        trackAnalyticsEvent('message_sent', {
            message: message,
            responseTime: responseTime,
            customerName: customerName || 'Anonymous',
            sessionId: sessionId,
            botResponse: data.data?.response || data.response
        });
        
        // ... rest of existing code ...
        
    } catch (error) {
        // ... existing error handling ...
    }
}
```

### 5. Track Conversation Completion

Add this to your new chat button event listener:
```javascript
newChatButton.addEventListener('click', () => {
    // Track conversation ended before clearing
    if (analyticsSessionId) {
        trackAnalyticsEvent('conversation_ended', {
            customerName: customerName || 'Anonymous',
            sessionDuration: Date.now() - (new Date(analyticsSessionId.split('_')[2]).getTime()),
            endReason: 'new_chat_requested'
        });
    }
    
    // Clear session and customer info from local storage
    localStorage.removeItem('shopifyChatbotSessionId');
    localStorage.removeItem('shopifyChatbotCustomerName');
    localStorage.removeItem('shopifyChatbotDiscountOffered');
    
    // Reset in-memory variables
    sessionId = null;
    customerName = null;
    analyticsSessionId = null; // Reset analytics session
    
    // Clear the chat messages and load the initial prompt
    chatMessages.innerHTML = '';
    loadChatHistory();
    
    console.log('New chat started. Session cleared.');
});
```

### 6. Track Conversions (Optional)

If you have conversion tracking, add this when a sale is detected:
```javascript
// Add this when you detect a purchase/conversion
function trackConversion(orderValue = 0) {
    trackAnalyticsEvent('conversion_completed', {
        customerName: customerName || 'Anonymous',
        orderValue: orderValue,
        conversionSource: 'chatbot_assistance'
    });
}
```

### 7. Track Customer Satisfaction (Optional)

If you add rating functionality:
```javascript
// Add this when customer provides satisfaction rating
function trackSatisfactionRating(rating) {
    trackAnalyticsEvent('satisfaction_rated', {
        customerName: customerName || 'Anonymous',
        rating: rating, // 1-5 scale
        sessionId: sessionId
    });
}
```

## Implementation Checklist

- [ ] Add analytics session variable
- [ ] Add tracking helper function  
- [ ] Track conversation started
- [ ] Track messages sent with response times
- [ ] Track conversation ended
- [ ] Test tracking in browser console
- [ ] Deploy updated widget
- [ ] Verify analytics dashboard shows real data

## Testing

1. Open browser console
2. Open chat widget 
3. Send a few messages
4. Look for `📊 Analytics Event:` logs
5. Check analytics dashboard for real data

Your analytics dashboard will automatically switch from demo data to real metrics once events start flowing in!
