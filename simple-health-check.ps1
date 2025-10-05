# Jarvis 2.0 Analytics Health Check
Write-Host "🔍 Jarvis 2.0 Analytics Health Check" -ForegroundColor Cyan

# Test Analytics Data API
Write-Host "Testing Analytics Data API..." -ForegroundColor Yellow
$uri = "https://jarvis2-0-djg1.onrender.com/api/analytics-data"
$params = @{
    shop = "test-shop"
    days = "30"
}

try {
    $analyticsData = Invoke-RestMethod -Uri $uri -Method GET -Body $params
    Write-Host "✅ Analytics Data API: WORKING" -ForegroundColor Green
    Write-Host "Total Conversations: $($analyticsData.overview.totalConversations)" -ForegroundColor Blue
    Write-Host "Unique Visitors: $($analyticsData.overview.uniqueVisitors)" -ForegroundColor Blue
    Write-Host "Response Rate: $($analyticsData.overview.responseRate)%" -ForegroundColor Blue
} catch {
    Write-Host "❌ Analytics Data API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Chat Proxy
Write-Host "`nTesting Chat Proxy..." -ForegroundColor Yellow
$chatUri = "https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/chat"
try {
    $response = Invoke-WebRequest -Uri $chatUri -Method GET
    Write-Host "✅ Chat Proxy: ACCESSIBLE" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Blue
} catch {
    Write-Host "❌ Chat Proxy: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Health Check Complete!" -ForegroundColor Cyan
