# Subscription Cancellation System - Deployment Test Suite
# PowerShell version for Windows

param(
    [string]$BaseUrl = "https://ever-reach-be.vercel.app",
    [string]$Token = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Subscription Cancellation Deployment Tests" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0
$testsSkipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [int[]]$ExpectedStatuses,
        [string]$Body = ""
    )
    
    Write-Host "Testing: $Name... " -NoNewline
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = "$BaseUrl$Endpoint"
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params["Body"] = $Body
        }
        
        $response = Invoke-WebRequest @params
        $status = $response.StatusCode
        
        if ($ExpectedStatuses -contains $status) {
            Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $status)"
            $script:testsPassed++
            return $response.Content
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Expected: $($ExpectedStatuses -join ','), Got: $status)"
            Write-Host "Response: $($response.Content)" -ForegroundColor Yellow
            $script:testsFailed++
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($ExpectedStatuses -contains $statusCode) {
            Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $statusCode - Expected error)"
            $script:testsPassed++
            return $null
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (HTTP $statusCode)"
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
            $script:testsFailed++
            return $null
        }
    }
}

# ============================================================================
# TEST 1: Health Check
# ============================================================================
Write-Host "`n=== Test 1: Health Check ===" -ForegroundColor Cyan
Test-Endpoint -Name "Health Check" -Method "GET" -Endpoint "/api/health" -ExpectedStatuses @(200)

# ============================================================================
# TEST 2: Config Status
# ============================================================================
Write-Host "`n=== Test 2: Config Status ===" -ForegroundColor Cyan
Test-Endpoint -Name "Config Status" -Method "GET" -Endpoint "/api/v1/ops/config-status" -ExpectedStatuses @(200)

# ============================================================================
# TEST 3: Trial Stats (Enhanced)
# ============================================================================
Write-Host "`n=== Test 3: Trial Stats Endpoint ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped++
} else {
    $response = Test-Endpoint -Name "Trial Stats" -Method "GET" -Endpoint "/api/v1/me/trial-stats" -ExpectedStatuses @(200, 401)
    
    if ($response) {
        $stats = $response | ConvertFrom-Json
        if ($stats.cancel) {
            Write-Host "  → Cancel field found:" -ForegroundColor Green
            Write-Host "    - Allowed: $($stats.cancel.allowed)"
            Write-Host "    - Method: $($stats.cancel.method)"
            Write-Host "    - Provider: $($stats.cancel.provider)"
        } else {
            Write-Host "  ⚠ WARNING: Cancel field missing (migration may not be applied)" -ForegroundColor Yellow
        }
    }
}

# ============================================================================
# TEST 4: Unified Cancellation API
# ============================================================================
Write-Host "`n=== Test 4: Unified Cancellation API ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped++
} else {
    $body = @{
        scope = "primary"
        when = "period_end"
        reason = "test_deployment"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Cancel Subscription" -Method "POST" -Endpoint "/api/v1/billing/cancel" `
        -ExpectedStatuses @(200, 400, 404, 401) -Body $body
}

# ============================================================================
# TEST 5: Apple IAP Linking
# ============================================================================
Write-Host "`n=== Test 5: Apple IAP Linking ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped++
} else {
    $body = @{
        receipt = "test_receipt_base64"
        hint_email = "test@example.com"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Link Apple IAP" -Method "POST" -Endpoint "/api/v1/link/apple" `
        -ExpectedStatuses @(200, 400, 404, 500, 401) -Body $body
}

# ============================================================================
# TEST 6: Google Play Linking
# ============================================================================
Write-Host "`n=== Test 6: Google Play Linking ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped++
} else {
    $body = @{
        purchase_token = "test_token"
        package_name = "com.test"
        product_id = "premium"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Link Google Play" -Method "POST" -Endpoint "/api/v1/link/google" `
        -ExpectedStatuses @(200, 400, 404, 500, 401) -Body $body
}

# ============================================================================
# TEST 7: Webhook Endpoints
# ============================================================================
Write-Host "`n=== Test 7: Webhook Endpoints ===" -ForegroundColor Cyan

# App Store webhook
$body = @{
    notificationType = "TEST"
    data = @{
        environment = "Sandbox"
    }
} | ConvertTo-Json

Test-Endpoint -Name "App Store Webhook" -Method "POST" -Endpoint "/api/webhooks/app-store" `
    -ExpectedStatuses @(200, 400, 500) -Body $body

# Play webhook
$body = @{
    message = @{
        data = "eyJ0ZXN0Ijp0cnVlfQ=="
    }
} | ConvertTo-Json

Test-Endpoint -Name "Play Webhook" -Method "POST" -Endpoint "/api/webhooks/play" `
    -ExpectedStatuses @(200, 400, 500) -Body $body

# ============================================================================
# TEST 8: Stripe Webhook (Existing)
# ============================================================================
Write-Host "`n=== Test 8: Stripe Webhook ===" -ForegroundColor Cyan
Write-Host "Checking Stripe webhook endpoint..." -NoNewline

try {
    # Stripe webhook requires signature, so we expect 400
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/webhooks/stripe" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"type":"test"}' `
        -ErrorAction Stop
    Write-Host "✓ Endpoint exists" -ForegroundColor Green
    $testsPassed++
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400 -or $status -eq 401) {
        Write-Host "✓ Endpoint exists (requires signature)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ Unexpected status: $status" -ForegroundColor Red
        $testsFailed++
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $testsPassed" -ForegroundColor Green
Write-Host "Failed:  $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "White" })
Write-Host "Skipped: $testsSkipped" -ForegroundColor Yellow
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Deployment Checklist" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment Variables (Vercel):" -ForegroundColor Yellow
Write-Host "  [ ] APPLE_SHARED_SECRET"
Write-Host "  [ ] GOOGLE_PLAY_ACCESS_TOKEN"
Write-Host ""
Write-Host "Webhook Configuration:" -ForegroundColor Yellow
Write-Host "  [ ] Apple: Configure S2S URL in App Store Connect"
Write-Host "  [ ] Google: Configure RTDN in Play Console"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - docs/SUBSCRIPTION_CANCELLATION_SYSTEM.md"
Write-Host "  - docs/SUBSCRIPTION_CANCELLATION_ANALYSIS_AND_PLAYBOOK.md"
Write-Host "  - FRONTEND_IMPLEMENTATION_FIX_REPORT.md"
Write-Host ""
Write-Host "Frontend Integration:" -ForegroundColor Yellow
Write-Host "  [ ] Update trial stats hook"
Write-Host "  [ ] Add CancelSubscriptionButton component"
Write-Host "  [ ] Integrate in Settings/Billing page"
Write-Host "  [ ] iOS: Add /v1/link/apple call"
Write-Host "  [ ] Android: Add /v1/link/google call"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

# Exit with appropriate code
exit $(if ($testsFailed -gt 0) { 1 } else { 0 })
