// Widget Configuration Loader
// This script loads the widget configuration and updates the widget with the correct URLs

(function() {
    'use strict';
    
    // Widget configuration
    let widgetConfig = null;
    
    // Function to get shop domain from current URL
    function getShopDomain() {
        return window.location.hostname;
    }
    
    // Function to load widget configuration
    async function loadWidgetConfig() {
        try {
            const shopDomain = getShopDomain();
            const configUrl = `https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/widget-config?shop=${shopDomain}`;
            
            console.log('🔧 Loading widget configuration for shop:', shopDomain);
            
            const response = await fetch(configUrl);
            const config = await response.json();
            
            if (config.success) {
                widgetConfig = config.config;
                console.log('✅ Widget configuration loaded:', widgetConfig);
                
                // Update global widget URLs if the widget is loaded
                if (window.JarvisWidget) {
                    updateWidgetUrls();
                }
                
                return widgetConfig;
            } else {
                console.error('❌ Failed to load widget configuration:', config);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading widget configuration:', error);
            return null;
        }
    }
    
    // Function to update widget URLs
    function updateWidgetUrls() {
        if (!widgetConfig || !window.JarvisWidget) return;
        
        console.log('🔄 Updating widget URLs with configuration');
        
        // Update the widget's API endpoints
        if (window.JarvisWidget.config) {
            window.JarvisWidget.config.apiEndpoints = {
                chat: widgetConfig.api_endpoints.chat,
                session: widgetConfig.api_endpoints.session,
                recommendations: widgetConfig.api_endpoints.recommendations,
                abandonedCartDiscount: widgetConfig.api_endpoints.abandoned_cart_discount,
                customerUpdate: widgetConfig.api_endpoints.customer_update
            };
            
            window.JarvisWidget.config.proxyBaseUrl = widgetConfig.proxy_base_url;
            
            console.log('✅ Widget URLs updated:', window.JarvisWidget.config.apiEndpoints);
        }
    }
    
    // Function to get API URL with fallback
    function getApiUrl(endpoint) {
        if (widgetConfig && widgetConfig.api_endpoints && widgetConfig.api_endpoints[endpoint]) {
            return widgetConfig.api_endpoints[endpoint];
        }
        
        // Fallback to full URLs
        const baseUrl = 'https://jarvis2-0-djg1.onrender.com';
        const endpoints = {
            chat: `${baseUrl}/a/jarvis-proxy/chat`,
            session: `${baseUrl}/a/jarvis-proxy/session`,
            recommendations: `${baseUrl}/a/jarvis-proxy/recommendations`,
            abandoned_cart_discount: `${baseUrl}/a/jarvis-proxy/abandoned-cart-discount`,
            customer_update: `${baseUrl}/a/jarvis-proxy/customer/update`
        };
        
        return endpoints[endpoint] || `${baseUrl}/a/jarvis-proxy/${endpoint}`;
    }
    
    // Make functions globally available
    window.JarvisWidgetConfig = {
        load: loadWidgetConfig,
        get: () => widgetConfig,
        getApiUrl: getApiUrl,
        update: updateWidgetUrls
    };
    
    // Auto-load configuration when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadWidgetConfig);
    } else {
        loadWidgetConfig();
    }
    
    console.log('🎯 Jarvis Widget Configuration Loader initialized');
})();