Write-Host "=== JARVIS 2.0 CART RECOVERY & WIDGET SETTINGS TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Widget Configuration
Write-Host "1. Testing Widget Configuration..." -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/widget-config?shop=test-shop" -Method GET
    Write-Host "   ✅ Widget Config API: WORKING" -ForegroundColor Green
    Write-Host "   📋 Shop: $($config.shop)" -ForegroundColor Blue
    Write-Host "   🎨 Success: $($config.success)" -ForegroundColor Blue
} catch {
    Write-Host "   ❌ Widget Config: FAILED" -ForegroundColor Red
}

# Test 2: Widget Settings  
Write-Host "`n2. Testing Widget Settings..." -ForegroundColor Yellow
try {
    $settings = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/widget-settings?shop=test-shop" -Method GET
    Write-Host "   ✅ Widget Settings API: WORKING" -ForegroundColor Green
    Write-Host "   📋 Shop: $($settings.shop)" -ForegroundColor Blue
    Write-Host "   🎯 Success: $($settings.success)" -ForegroundColor Blue
    Write-Host "   🎨 Primary Color: $($settings.settings.primaryColor)" -ForegroundColor Blue
} catch {
    Write-Host "   ❌ Widget Settings: FAILED" -ForegroundColor Red
}

# Test 3: Cart Abandonment Test Page
Write-Host "`n3. Testing Cart Abandonment Test Page..." -ForegroundColor Yellow
try {
    $testPage = Invoke-WebRequest -Uri "https://jarvis2-0-djg1.onrender.com/app/cart-abandonment-test" -Method GET
    Write-Host "   ✅ Cart Abandonment Test Page: ACCESSIBLE" -ForegroundColor Green
    Write-Host "   📊 Status Code: $($testPage.StatusCode)" -ForegroundColor Blue
    Write-Host "   📄 Content Size: $($testPage.Content.Length) bytes" -ForegroundColor Blue
} catch {
    Write-Host "   ❌ Cart Abandonment Test Page: FAILED" -ForegroundColor Red
}

# Test 4: Analytics Integration  
Write-Host "`n4. Testing Analytics Integration..." -ForegroundColor Yellow
try {
    $analytics = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=test-shop&days=7" -Method GET
    Write-Host "   ✅ Analytics API: WORKING" -ForegroundColor Green
    Write-Host "   💬 Total Conversations: $($analytics.overview.totalConversations)" -ForegroundColor Blue
    Write-Host "   👥 Unique Visitors: $($analytics.overview.uniqueVisitors)" -ForegroundColor Blue
    Write-Host "   📈 Response Rate: $($analytics.overview.responseRate)%" -ForegroundColor Blue
} catch {
    Write-Host "   ❌ Analytics: FAILED" -ForegroundColor Red
}

Write-Host "`n🎉 CART RECOVERY & WIDGET SETTINGS HEALTH CHECK COMPLETED!" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
