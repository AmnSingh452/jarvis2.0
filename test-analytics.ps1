Write-Host "Jarvis 2.0 Analytics Health Check" -ForegroundColor Cyan

# Test Analytics Data API
Write-Host "Testing Analytics Data API..." -ForegroundColor Yellow
$uri = "https://jarvis2-0-djg1.onrender.com/api/analytics-data"

try {
    $result = Invoke-RestMethod -Uri "$uri`?shop=test-shop&days=30" -Method GET
    Write-Host "Analytics Data API: WORKING" -ForegroundColor Green
    Write-Host "Total Conversations: $($result.overview.totalConversations)" -ForegroundColor Blue
    Write-Host "Unique Visitors: $($result.overview.uniqueVisitors)" -ForegroundColor Blue
} catch {
    Write-Host "Analytics Data API: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "Health Check Complete!" -ForegroundColor Cyan
