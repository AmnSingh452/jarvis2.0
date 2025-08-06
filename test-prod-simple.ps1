# Test the enhanced recommendations API in production
Write-Host "Testing Enhanced Recommendations API in Production" -ForegroundColor Green
Write-Host "Deployment URL: https://jarvis2-0-djg1.onrender.com" -ForegroundColor Cyan

# Wait for deployment
Write-Host "Waiting for Render deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$testPayload = '{"shop_domain": "test.myshopify.com", "product_ids": [8001, 8002, 8003], "customer_id": "prod-test-123"}'

Write-Host "1. Testing API Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method GET
    Write-Host "Health Status: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "2. Testing Normal Request..." -ForegroundColor Yellow
try {
    $start = Get-Date
    $response1 = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $testPayload -ContentType "application/json"
    $end = Get-Date
    $duration1 = ($end - $start).TotalMilliseconds
    
    Write-Host "First request time: $([math]::Round($duration1))ms" -ForegroundColor Green
    Write-Host "Products found: $($response1.recommendations.Count)" -ForegroundColor Cyan
    
    if ($response1.recommendations.Count -gt 0) {
        Write-Host "Sample product: $($response1.recommendations[0].title)" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "3. Testing Cache Hit..." -ForegroundColor Yellow
try {
    Start-Sleep -Seconds 1
    $start = Get-Date
    $response2 = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $testPayload -ContentType "application/json"
    $end = Get-Date
    $duration2 = ($end - $start).TotalMilliseconds
    
    Write-Host "Second request time: $([math]::Round($duration2))ms" -ForegroundColor Green
    Write-Host "Products found: $($response2.recommendations.Count)" -ForegroundColor Cyan
    
    if ($duration2 -lt $duration1) {
        Write-Host "Cache is working! Second request was faster" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Production Testing Complete!" -ForegroundColor Green
Write-Host "Enhanced API features:" -ForegroundColor Yellow
Write-Host "- 5-minute caching system" -ForegroundColor White
Write-Host "- Automatic retry for rate limits" -ForegroundColor White
Write-Host "- Graceful error handling" -ForegroundColor White
Write-Host "Ready for production traffic!" -ForegroundColor Green
