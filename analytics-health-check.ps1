# Jarvis 2.0 Analytics Health Check Script
# PowerShell script to test analytics functionality

Write-Host "🔍 Jarvis 2.0 Analytics Health Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Analytics Page
Write-Host "`n1. Testing Analytics Page..." -ForegroundColor Yellow
try {
    $analyticsPage = Invoke-WebRequest -Uri "https://jarvis2-0-djg1.onrender.com/app/analytics" -Method GET
    if ($analyticsPage.StatusCode -eq 200) {
        Write-Host "✅ Analytics Page: WORKING" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Analytics Page: FAILED" -ForegroundColor Red
}

# Test 2: Analytics Data API
Write-Host "`n2. Testing Analytics Data API..." -ForegroundColor Yellow
try {
    $uri = "https://jarvis2-0-djg1.onrender.com/api/analytics-data?shop=test-shop&days=30"
    $analyticsData = Invoke-RestMethod -Uri $uri -Method GET
    if ($analyticsData.overview -and $analyticsData.timeData) {
        Write-Host "✅ Analytics Data API: WORKING" -ForegroundColor Green
        Write-Host "   📊 Total Conversations: $($analyticsData.overview.totalConversations)" -ForegroundColor Blue
        Write-Host "   👥 Unique Visitors: $($analyticsData.overview.uniqueVisitors)" -ForegroundColor Blue
        Write-Host "   📈 Response Rate: $($analyticsData.overview.responseRate)%" -ForegroundColor Blue
    }
} catch {
    Write-Host "❌ Analytics Data API: FAILED" -ForegroundColor Red
}

# Test 3: Analytics Event Tracking
Write-Host "`n3. Testing Message Tracking..." -ForegroundColor Yellow
try {
    $eventData = @{
        eventType = "message"
        shopDomain = "test-shop"
        sessionId = "health-check-" + (Get-Date -Format "yyyyMMddHHmmss")
        data = @{
            messageLength = 25
            responseTime = 1.2
        }
    } | ConvertTo-Json

    $trackingResult = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/analytics-event" -Method POST -ContentType "application/json" -Body $eventData
    if ($trackingResult.success) {
        Write-Host "✅ Message Tracking: WORKING" -ForegroundColor Green
        Write-Host "   📝 Event: $($trackingResult.message)" -ForegroundColor Blue
    }
} catch {
    Write-Host "❌ Message Tracking: FAILED" -ForegroundColor Red
}

# Test 4: Chat Proxy with Analytics
Write-Host "`n4. Testing Chat Proxy Analytics Integration..." -ForegroundColor Yellow
try {
    $chatData = @{
        session_id = "health-check-chat-" + (Get-Date -Format "yyyyMMddHHmmss")
        message = "This is a test message for analytics"
        shop = "test-shop"
    } | ConvertTo-Json

    $chatResult = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/chat" -Method POST -ContentType "application/json" -Body $chatData
    Write-Host "✅ Chat Proxy: RESPONDING" -ForegroundColor Green
    Write-Host "   💬 Session ID: $($chatResult.data.session_id)" -ForegroundColor Blue
} catch {
    Write-Host "⚠️ Chat Proxy: LIMITED (Expected without full auth)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Analytics Health Check Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
