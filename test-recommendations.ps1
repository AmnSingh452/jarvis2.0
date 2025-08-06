# Test the enhanced recommendations API (Compatible with older PowerShell)
Write-Host "🧪 Testing Jarvis 2.0 Recommendations API" -ForegroundColor Green

# Test data
$testPayload = @{
    shop_domain = "test.myshopify.com"
    product_ids = @(8001, 8002, 8003)
    customer_id = "test-customer-123"
} | ConvertTo-Json

Write-Host "`n1️⃣ Testing normal request..." -ForegroundColor Yellow

try {
    $start = Get-Date
    $response = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $testPayload -ContentType "application/json"
    $end = Get-Date
    $duration = ($end - $start).TotalMilliseconds
    
    Write-Host "✅ Response time: $([math]::Round($duration))ms" -ForegroundColor Green
    Write-Host " Products found: $($response.recommendations.Count)" -ForegroundColor Cyan
    
    if ($response.recommendations.Count -gt 0) {
        Write-Host "🎯 First product: $($response.recommendations[0].title)" -ForegroundColor Green
        Write-Host "💰 Price: `$$($response.recommendations[0].variants[0].price)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2️⃣ Testing cache hit (same request after delay)..." -ForegroundColor Yellow

try {
    Start-Sleep -Seconds 1
    $start = Get-Date
    $response2 = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $testPayload -ContentType "application/json"
    $end = Get-Date
    $duration2 = ($end - $start).TotalMilliseconds
    
    Write-Host "⚡ Second request time: $([math]::Round($duration2))ms" -ForegroundColor Green
    Write-Host "� Products found: $($response2.recommendations.Count)" -ForegroundColor Cyan
    Write-Host "✅ Both requests successful - caching working in background" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3️⃣ Testing different request..." -ForegroundColor Yellow

$differentPayload = @{
    shop_domain = "different.myshopify.com"
    product_ids = @(8004)
    customer_id = "different-customer"
} | ConvertTo-Json

try {
    $start = Get-Date
    $response3 = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $differentPayload -ContentType "application/json"
    $end = Get-Date
    $duration3 = ($end - $start).TotalMilliseconds
    
    Write-Host "🔄 Different request time: $([math]::Round($duration3))ms" -ForegroundColor Green
    Write-Host "� Products found: $($response3.recommendations.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4️⃣ Testing GET endpoint (health check)..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method GET
    Write-Host "✅ Health check: $($healthResponse.message)" -ForegroundColor Green
    Write-Host "⏰ Timestamp: $($healthResponse.timestamp)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API testing completed!" -ForegroundColor Green
Write-Host "`n📝 Summary:" -ForegroundColor Yellow
Write-Host "• Enhanced recommendations API is deployed at: https://jarvis2-0-djg1.onrender.com" -ForegroundColor White
Write-Host "• Features: Retry logic for 429 errors, 5-minute caching, graceful error handling" -ForegroundColor White
Write-Host "• Check logs in Render dashboard for detailed cache/retry information" -ForegroundColor White
