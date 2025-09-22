# Jarvis AI Chatbot - Quick Test Script
# Run this in PowerShell to test all critical endpoints

Write-Host "🧪 Starting Jarvis AI Chatbot Tests..." -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing App Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "https://jarvis2-0-djg1.onrender.com/health" -TimeoutSec 10
    Write-Host "✅ Health Check: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Shop Verification
Write-Host "`n2. Testing Shop Data..." -ForegroundColor Yellow
try {
    $shop = Invoke-WebRequest -Uri "https://jarvis2-0-djg1.onrender.com/api/installation?action=verify&shop=aman-chatbot-test.myshopify.com" -TimeoutSec 10
    $shopData = $shop.Content | ConvertFrom-Json
    if ($shopData.oldShops -eq 1) {
        Write-Host "✅ Shop Data: Present in database" -ForegroundColor Green
    } else {
        Write-Host "❌ Shop Data: Missing from database" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Shop Verification Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Widget Config
Write-Host "`n3. Testing Widget Config..." -ForegroundColor Yellow
try {
    $widget = Invoke-WebRequest -Uri "https://aman-chatbot-test.myshopify.com/a/jarvis2-0/widget-config" -TimeoutSec 15
    Write-Host "✅ Widget Config: $($widget.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Widget Config Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Chat Endpoint
Write-Host "`n4. Testing Chat Functionality..." -ForegroundColor Yellow
try {
    $chatBody = @{
        message = "Hello, test message"
        session_id = "test-$(Get-Random)"
    } | ConvertTo-Json
    
    $chat = Invoke-WebRequest -Uri "https://aman-chatbot-test.myshopify.com/a/jarvis2-0/chat" -Method POST -Body $chatBody -ContentType "application/json" -TimeoutSec 20
    Write-Host "✅ Chat Endpoint: $($chat.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Chat Endpoint Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Recommendations
Write-Host "`n5. Testing Recommendations..." -ForegroundColor Yellow
try {
    $recs = Invoke-WebRequest -Uri "https://aman-chatbot-test.myshopify.com/a/jarvis2-0/recommendations" -TimeoutSec 15
    Write-Host "✅ Recommendations: $($recs.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Recommendations Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Testing Complete!" -ForegroundColor Green
Write-Host "Check results above. All ✅ tests should pass for app store submission." -ForegroundColor Cyan
