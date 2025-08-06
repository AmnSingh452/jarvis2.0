# Simple test for the enhanced recommendations API
Write-Host "Testing Jarvis 2.0 Recommendations API..." -ForegroundColor Green

$testPayload = '{"shop_domain": "test.myshopify.com", "product_ids": [8001, 8002], "customer_id": "test123"}'

Write-Host "Sending test request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method POST -Body $testPayload -ContentType "application/json"
    
    Write-Host "Success! Products found: $($response.recommendations.Count)" -ForegroundColor Green
    
    if ($response.recommendations.Count -gt 0) {
        Write-Host "First product: $($response.recommendations[0].title)" -ForegroundColor Cyan
        Write-Host "Price: `$$($response.recommendations[0].variants[0].price)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Testing health check..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "https://jarvis2-0-djg1.onrender.com/api/recommendations" -Method GET
    Write-Host "Health check: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "API test completed!" -ForegroundColor Green
