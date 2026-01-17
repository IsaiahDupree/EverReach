# Comprehensive API Endpoint Testing Script
# Tests all endpoints on https://ever-reach-be.vercel.app

param(
    [string]$JwtToken = "",
    [string]$ApiKey = ""
)

$baseUrl = "https://ever-reach-be.vercel.app"
$results = @()

function Test-Endpoint {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [string]$Description,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [bool]$RequiresAuth = $false
    )
    
    Write-Host "`n🧪 Testing: $Description" -ForegroundColor Cyan
    Write-Host "   $Method $Path" -ForegroundColor Gray
    
    $url = "$baseUrl$Path"
    $allHeaders = $Headers.Clone()
    
    if ($RequiresAuth -and $JwtToken) {
        $allHeaders["Authorization"] = "Bearer $JwtToken"
    }
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $allHeaders
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        $result = @{
            Path = $Path
            Description = $Description
            Status = $response.StatusCode
            Success = $true
            Response = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        }
        
        Write-Host "   ✅ $($response.StatusCode) - Success" -ForegroundColor Green
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $result = @{
            Path = $Path
            Description = $Description
            Status = $statusCode
            Success = $false
            Error = $_.Exception.Message
        }
        
        if ($statusCode -eq 401) {
            Write-Host "   🔒 401 - Requires Authentication" -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "   ❌ 404 - Not Found" -ForegroundColor Red
        } else {
            Write-Host "   ⚠️  $statusCode - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    $script:results += $result
    Start-Sleep -Milliseconds 100
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  EverReach Backend API - Comprehensive Endpoint Testing" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================
Write-Host "`n📊 HEALTH & STATUS ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/health" -Description "Health Check"
Test-Endpoint -Path "/api/v1/ops/health" -Description "V1 Health Check"
Test-Endpoint -Path "/api/v1/ops/config-status" -Description "Config Status" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/ops/sku-status" -Description "SKU Status"

# ============================================================================
# PUBLIC API - CONTACTS
# ============================================================================
Write-Host "`n👥 CONTACTS ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/contacts" -Description "List Contacts" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/search?q=test" -Description "Search Contacts" -RequiresAuth $true

# ============================================================================
# PUBLIC API - CONTEXT BUNDLE (Most Important for AI)
# ============================================================================
Write-Host "`n🤖 CONTEXT BUNDLE ENDPOINT (AI)" -ForegroundColor Magenta

# Note: Requires actual contact ID
Write-Host "   ℹ️  Context bundle requires valid contact ID - skipping for now" -ForegroundColor Gray

# ============================================================================
# AI AGENT ENDPOINTS
# ============================================================================
Write-Host "`n🧠 AI AGENT ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/agent/tools" -Description "List Agent Tools" -RequiresAuth $true

Test-Endpoint -Method "POST" -Path "/api/v1/agent/chat" `
    -Description "Agent Chat" `
    -RequiresAuth $true `
    -Body '{"message":"Hello, can you help me?"}'

Test-Endpoint -Method "POST" -Path "/api/v1/agent/voice-note/process" `
    -Description "Process Voice Note" `
    -RequiresAuth $true `
    -Body '{"transcript":"I met with John today about the project"}'

Test-Endpoint -Method "POST" -Path "/api/v1/agent/suggest/actions" `
    -Description "Suggest Actions" `
    -RequiresAuth $true

# ============================================================================
# BILLING ENDPOINTS
# ============================================================================
Write-Host "`n💳 BILLING ENDPOINTS (STRIPE)" -ForegroundColor Magenta

Test-Endpoint -Method "POST" -Path "/api/billing/checkout" `
    -Description "Create Checkout Session" `
    -RequiresAuth $true

Test-Endpoint -Method "POST" -Path "/api/billing/portal" `
    -Description "Customer Portal" `
    -RequiresAuth $true

# ============================================================================
# INTERACTIONS
# ============================================================================
Write-Host "`n💬 INTERACTIONS ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/interactions" -Description "List Interactions" -RequiresAuth $true

# ============================================================================
# CUSTOM FIELDS
# ============================================================================
Write-Host "`n🏷️  CUSTOM FIELDS ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/custom-fields?entity=contact" -Description "List Custom Fields" -RequiresAuth $true

# ============================================================================
# PIPELINES & GOALS
# ============================================================================
Write-Host "`n📈 PIPELINES & GOALS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/pipelines" -Description "List Pipelines" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/goals" -Description "List Goals" -RequiresAuth $true

# ============================================================================
# TEMPLATES & MESSAGES
# ============================================================================
Write-Host "`n📝 TEMPLATES & MESSAGES" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/templates" -Description "List Templates" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/messages" -Description "List Messages" -RequiresAuth $true

# ============================================================================
# USER/ME ENDPOINTS
# ============================================================================
Write-Host "`n👤 USER ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/me" -Description "Get Current User" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/me/account" -Description "User Account" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/me/entitlements" -Description "User Entitlements" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/me/persona-notes" -Description "Persona Notes" -RequiresAuth $true

# ============================================================================
# WARMTH & ANALYSIS
# ============================================================================
Write-Host "`n🌡️  WARMTH & ANALYSIS" -ForegroundColor Magenta

Test-Endpoint -Method "POST" -Path "/api/v1/warmth/recompute" `
    -Description "Recompute Warmth" `
    -RequiresAuth $true `
    -Body '{}'

# ============================================================================
# OPENAI ENDPOINTS
# ============================================================================
Write-Host "`n🔮 OPENAI ENDPOINTS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/openai/models" -Description "List OpenAI Models" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/openai/test" -Description "Test OpenAI" -RequiresAuth $true

# ============================================================================
# ALERTS & NOTIFICATIONS
# ============================================================================
Write-Host "`n🔔 ALERTS & NOTIFICATIONS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/alerts" -Description "List Alerts" -RequiresAuth $true
Test-Endpoint -Path "/api/v1/push-tokens" -Description "Push Tokens" -RequiresAuth $true

# ============================================================================
# WEBHOOKS
# ============================================================================
Write-Host "`n🪝 WEBHOOKS" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/webhooks/test" -Description "Test Webhook" -RequiresAuth $true

# ============================================================================
# OPENAPI SPEC
# ============================================================================
Write-Host "`n📚 API DOCUMENTATION" -ForegroundColor Magenta

Test-Endpoint -Path "/api/v1/.well-known/openapi.json" -Description "OpenAPI Specification"

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$successful = ($results | Where-Object { $_.Success }).Count
$requiresAuth = ($results | Where-Object { $_.Status -eq 401 }).Count
$notFound = ($results | Where-Object { $_.Status -eq 404 }).Count
$errors = ($results | Where-Object { -not $_.Success -and $_.Status -ne 401 -and $_.Status -ne 404 }).Count

Write-Host "`n✅ Successful: $successful" -ForegroundColor Green
Write-Host "🔒 Requires Auth (401): $requiresAuth" -ForegroundColor Yellow
Write-Host "❌ Not Found (404): $notFound" -ForegroundColor Red
Write-Host "⚠️  Other Errors: $errors" -ForegroundColor Yellow
Write-Host "`nTotal Endpoints Tested: $($results.Count)" -ForegroundColor Cyan

# Export results to JSON
$results | ConvertTo-Json -Depth 3 | Out-File "endpoint-test-results.json"
Write-Host "`n📄 Detailed results saved to: endpoint-test-results.json" -ForegroundColor Gray

# Show endpoints that need authentication
if ($requiresAuth -gt 0 -and -not $JwtToken) {
    Write-Host "`n💡 TIP: Run with -JwtToken parameter to test authenticated endpoints" -ForegroundColor Cyan
    Write-Host "   Example: .\test-all-endpoints.ps1 -JwtToken 'your_jwt_token_here'" -ForegroundColor Gray
}

Write-Host ""
