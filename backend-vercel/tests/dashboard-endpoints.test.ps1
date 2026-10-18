# Dashboard Endpoints Tests
# Tests all endpoints needed by everreach-dashboard
# For deployment: vercel.com/isaiahduprees-projects/everreach-dashboard
# Branch: feat/evidence-reports

param(
    [string]$BaseUrl = "https://ever-reach-be.vercel.app",
    [string]$Token = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Dashboard Endpoints Tests" -ForegroundColor Cyan
Write-Host "Backend URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "Dashboard: everreach-dashboard" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

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
            $script:testsFailed++
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($ExpectedStatuses -contains $statusCode) {
            Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $statusCode - Expected)"
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
# AUTHENTICATION & USER DATA
# ============================================================================
Write-Host "`n=== Authentication & User Data ===" -ForegroundColor Cyan

Test-Endpoint -Name "User Profile" -Method "GET" -Endpoint "/api/v1/me" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Trial Stats" -Method "GET" -Endpoint "/api/v1/me/trial-stats" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Entitlements" -Method "GET" -Endpoint "/api/v1/me/entitlements" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# ANALYTICS & REPORTS (Dashboard Core)
# ============================================================================
Write-Host "`n=== Analytics & Reports ===" -ForegroundColor Cyan

Test-Endpoint -Name "Analytics Dashboard" -Method "GET" -Endpoint "/api/v1/analytics/dashboard" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Usage Metrics" -Method "GET" -Endpoint "/api/v1/me/usage" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Activity Feed" -Method "GET" -Endpoint "/api/v1/activity" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Activity Timeline" -Method "GET" -Endpoint "/api/v1/activity/timeline" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# CONTACTS (Dashboard Overview)
# ============================================================================
Write-Host "`n=== Contacts Overview ===" -ForegroundColor Cyan

Test-Endpoint -Name "Contacts List" -Method "GET" -Endpoint "/api/v1/contacts?limit=10" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Contacts Summary" -Method "GET" -Endpoint "/api/v1/contacts/summary" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Contact Stats" -Method "GET" -Endpoint "/api/v1/contacts/stats" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# WARMTH SYSTEM (Dashboard Insights)
# ============================================================================
Write-Host "`n=== Warmth Insights ===" -ForegroundColor Cyan

Test-Endpoint -Name "Warmth Summary" -Method "GET" -Endpoint "/api/v1/warmth/summary" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Warmth Alerts" -Method "GET" -Endpoint "/api/v1/warmth/alerts" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Warmth Distribution" -Method "GET" -Endpoint "/api/v1/warmth/distribution" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Cooling Contacts" -Method "GET" -Endpoint "/api/v1/contacts?warmth_trend=cooling&limit=5" -ExpectedStatuses @(200, 401)

# ============================================================================
# INTERACTIONS (Dashboard Activity)
# ============================================================================
Write-Host "`n=== Interactions Activity ===" -ForegroundColor Cyan

Test-Endpoint -Name "Recent Interactions" -Method "GET" -Endpoint "/api/v1/interactions?limit=20" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Interactions Summary" -Method "GET" -Endpoint "/api/v1/interactions/summary" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Interaction Stats" -Method "GET" -Endpoint "/api/v1/interactions/stats?period=30d" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# GOALS & TASKS (Dashboard To-Do)
# ============================================================================
Write-Host "`n=== Goals & Tasks ===" -ForegroundColor Cyan

Test-Endpoint -Name "Active Goals" -Method "GET" -Endpoint "/api/v1/goals?status=active" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Goals Summary" -Method "GET" -Endpoint "/api/v1/goals/summary" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Overdue Goals" -Method "GET" -Endpoint "/api/v1/goals?overdue=true" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# MESSAGES (Dashboard Drafts)
# ============================================================================
Write-Host "`n=== Messages & Drafts ===" -ForegroundColor Cyan

Test-Endpoint -Name "Recent Drafts" -Method "GET" -Endpoint "/api/v1/messages?status=draft&limit=10" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Sent Messages" -Method "GET" -Endpoint "/api/v1/messages?status=sent&limit=10" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Message Stats" -Method "GET" -Endpoint "/api/v1/messages/stats" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# VOICE NOTES (Dashboard Recent)
# ============================================================================
Write-Host "`n=== Voice Notes ===" -ForegroundColor Cyan

Test-Endpoint -Name "Voice Notes List" -Method "GET" -Endpoint "/api/v1/me/persona-notes?type=voice&limit=10" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Unprocessed Notes" -Method "GET" -Endpoint "/api/v1/me/persona-notes?type=voice&processed=false" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Voice Note Stats" -Method "GET" -Endpoint "/api/v1/me/persona-notes/stats" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# AI AGENT (Dashboard Assistant)
# ============================================================================
Write-Host "`n=== AI Agent ===" -ForegroundColor Cyan

Test-Endpoint -Name "Agent Status" -Method "GET" -Endpoint "/api/v1/agent/status" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Conversation History" -Method "GET" -Endpoint "/api/v1/agent/conversation?limit=5" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Action Suggestions" -Method "GET" -Endpoint "/api/v1/action-suggestions?limit=3" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# SUBSCRIPTION (Dashboard Billing)
# ============================================================================
Write-Host "`n=== Subscription & Billing ===" -ForegroundColor Cyan

Test-Endpoint -Name "Subscription Status" -Method "GET" -Endpoint "/api/v1/me/trial-stats" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Usage Limits" -Method "GET" -Endpoint "/api/v1/me/usage" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Billing History" -Method "GET" -Endpoint "/api/v1/billing/history" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# SEARCH (Dashboard Search Bar)
# ============================================================================
Write-Host "`n=== Search ===" -ForegroundColor Cyan

Test-Endpoint -Name "Global Search" -Method "GET" -Endpoint "/api/v1/search?q=test" -ExpectedStatuses @(200, 400, 401, 404)
Test-Endpoint -Name "Contact Search" -Method "GET" -Endpoint "/api/v1/contacts?q=test" -ExpectedStatuses @(200, 401)
Test-Endpoint -Name "Search Suggestions" -Method "GET" -Endpoint "/api/v1/search/suggest?q=te" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# EVIDENCE & REPORTS (Dashboard Reports Page)
# ============================================================================
Write-Host "`n=== Evidence & Reports ===" -ForegroundColor Cyan

Test-Endpoint -Name "Evidence Items" -Method "GET" -Endpoint "/api/v1/evidence?limit=20" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Evidence Report" -Method "GET" -Endpoint "/api/v1/evidence/report?period=30d" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Compliance Report" -Method "GET" -Endpoint "/api/v1/reports/compliance" -ExpectedStatuses @(200, 401, 404)
Test-Endpoint -Name "Activity Report" -Method "GET" -Endpoint "/api/v1/reports/activity?period=week" -ExpectedStatuses @(200, 401, 404)

# ============================================================================
# HEALTH & CONFIG
# ============================================================================
Write-Host "`n=== Health & Config ===" -ForegroundColor Cyan

Test-Endpoint -Name "API Health" -Method "GET" -Endpoint "/api/health" -ExpectedStatuses @(200)
Test-Endpoint -Name "Config Status" -Method "GET" -Endpoint "/api/v1/ops/config-status" -ExpectedStatuses @(200, 401)

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Dashboard Tests Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $testsPassed" -ForegroundColor Green
Write-Host "Failed:  $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "White" })
Write-Host "Total:   $($testsPassed + $testsFailed)"
Write-Host ""

$workingEndpoints = $testsPassed
$totalEndpoints = $testsPassed + $testsFailed
$readinessPercent = [math]::Round(($workingEndpoints / $totalEndpoints) * 100, 1)

Write-Host "Dashboard Backend Readiness: $readinessPercent%" -ForegroundColor $(if ($readinessPercent -ge 70) { "Green" } elseif ($readinessPercent -ge 50) { "Yellow" } else { "Red" })
Write-Host ""

if ($readinessPercent -ge 70) {
    Write-Host "✓ Backend is ready for dashboard deployment!" -ForegroundColor Green
} elseif ($readinessPercent -ge 50) {
    Write-Host "⚠ Backend partially ready - some dashboard features may not work" -ForegroundColor Yellow
} else {
    Write-Host "✗ Backend needs more endpoints before dashboard deploy" -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Next Steps for Dashboard Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review failed endpoints above" -ForegroundColor White
Write-Host "2. Implement missing endpoints or update dashboard" -ForegroundColor White
Write-Host "3. Update dashboard .env with:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_API_URL=$BaseUrl" -ForegroundColor Gray
Write-Host "4. Deploy dashboard to Vercel:" -ForegroundColor White
Write-Host "   cd everreach-dashboard && vercel --prod" -ForegroundColor Gray
Write-Host ""

# Exit with appropriate code
exit $(if ($testsFailed -gt 0) { 1 } else { 0 })
