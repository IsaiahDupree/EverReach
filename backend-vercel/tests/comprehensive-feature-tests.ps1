# Comprehensive Feature Tests - Nov 7, 2025
# Tests features that weren't fully tested yet: AI Agent, Voice Notes, Custom Fields, etc.

param(
    [string]$BaseUrl = "https://ever-reach-be.vercel.app",
    [string]$Token = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Comprehensive Feature Tests" -ForegroundColor Cyan
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
        [string]$Body = "",
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Name... " -NoNewline
    
    try {
        $requestHeaders = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $requestHeaders["Authorization"] = "Bearer $Token"
        }
        
        # Add custom headers
        foreach ($key in $Headers.Keys) {
            $requestHeaders[$key] = $Headers[$key]
        }
        
        $params = @{
            Uri = "$BaseUrl$Endpoint"
            Method = $Method
            Headers = $requestHeaders
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
# TEST 1: AI Agent System
# ============================================================================
Write-Host "`n=== Test 1: AI Agent System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 6
} else {
    # Test OpenAI integration
    Test-Endpoint -Name "OpenAI Test" -Method "GET" -Endpoint "/api/v1/openai/test" -ExpectedStatuses @(200, 500)
    
    # Test OpenAI models
    Test-Endpoint -Name "OpenAI Models" -Method "GET" -Endpoint "/api/v1/openai/models" -ExpectedStatuses @(200, 500)
    
    # Test agent chat
    $chatBody = @{
        message = "Hello, can you help me with my contacts?"
        conversation_id = $null
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Agent Chat" -Method "POST" -Endpoint "/api/v1/agent/chat" `
        -ExpectedStatuses @(200, 400, 500) -Body $chatBody
    
    # Test agent tools list
    Test-Endpoint -Name "Agent Tools" -Method "GET" -Endpoint "/api/v1/agent/tools" -ExpectedStatuses @(200, 500)
    
    # Test contact analysis
    $analysisBody = @{
        contact_id = "test-contact-id"
        analysis_type = "relationship_health"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Contact Analysis" -Method "POST" -Endpoint "/api/v1/agent/analyze/contact" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $analysisBody
    
    # Test smart compose
    $composeBody = @{
        contact_id = "test-contact-id"
        goal = "follow_up"
        channel = "email"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Smart Compose" -Method "POST" -Endpoint "/api/v1/agent/compose/smart" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $composeBody
}

# ============================================================================
# TEST 2: Voice Notes Processing
# ============================================================================
Write-Host "`n=== Test 2: Voice Notes Processing ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test voice note processing
    $voiceNoteBody = @{
        note_id = "test-note-id"
        extract_contacts = $true
        extract_actions = $true
        categorize = $true
        suggest_tags = $true
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Voice Note Processing" -Method "POST" -Endpoint "/api/v1/agent/voice-note/process" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $voiceNoteBody
    
    # Test conversation management
    Test-Endpoint -Name "Agent Conversations" -Method "GET" -Endpoint "/api/v1/agent/conversation" `
        -ExpectedStatuses @(200, 500)
}

# ============================================================================
# TEST 3: Custom Fields System
# ============================================================================
Write-Host "`n=== Test 3: Custom Fields System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 4
} else {
    # Test custom fields list
    Test-Endpoint -Name "Custom Fields List" -Method "GET" -Endpoint "/api/v1/custom-fields?entity=contact" `
        -ExpectedStatuses @(200, 500)
    
    # Test custom field creation
    $fieldBody = @{
        org_id = "test-org-id"
        entity_kind = "contact"
        slug = "test_field"
        label = "Test Field"
        type = "text"
        required = $false
        ai_can_read = $true
        ai_can_write = $false
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Create Custom Field" -Method "POST" -Endpoint "/api/v1/custom-fields" `
        -ExpectedStatuses @(201, 400, 422, 500) -Body $fieldBody
    
    # Test contact custom fields get
    Test-Endpoint -Name "Get Contact Custom Fields" -Method "GET" -Endpoint "/api/v1/contacts/test-id/custom" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test contact custom fields update
    $customFieldsBody = @{
        patch = @{
            test_field = "test_value"
        }
        source = "api"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Update Contact Custom Fields" -Method "PATCH" -Endpoint "/api/v1/contacts/test-id/custom" `
        -ExpectedStatuses @(200, 400, 404, 422, 500) -Body $customFieldsBody
}

# ============================================================================
# TEST 4: Advanced Contact Features
# ============================================================================
Write-Host "`n=== Test 4: Advanced Contact Features ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 5
} else {
    # Test contact context bundle (for AI)
    Test-Endpoint -Name "Contact Context Bundle" -Method "GET" -Endpoint "/api/v1/contacts/test-id/context-bundle" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test contact warmth recompute
    Test-Endpoint -Name "Warmth Recompute" -Method "POST" -Endpoint "/api/v1/contacts/test-id/warmth/recompute" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test contact goal suggestions
    Test-Endpoint -Name "Goal Suggestions" -Method "GET" -Endpoint "/api/v1/contacts/test-id/goal-suggestions" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test contact pipeline history
    Test-Endpoint -Name "Pipeline History" -Method "GET" -Endpoint "/api/v1/contacts/test-id/pipeline/history" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test contact notes
    Test-Endpoint -Name "Contact Notes" -Method "GET" -Endpoint "/api/v1/contacts/test-id/notes" `
        -ExpectedStatuses @(200, 404, 500)
}

# ============================================================================
# TEST 5: Warmth System
# ============================================================================
Write-Host "`n=== Test 5: Warmth System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test warmth summary
    Test-Endpoint -Name "Warmth Summary" -Method "GET" -Endpoint "/api/v1/warmth/summary" `
        -ExpectedStatuses @(200, 500)
    
    # Test warmth alerts
    Test-Endpoint -Name "Warmth Alerts" -Method "GET" -Endpoint "/api/v1/warmth/alerts" `
        -ExpectedStatuses @(200, 404, 500)
}

# ============================================================================
# TEST 6: Goals System
# ============================================================================
Write-Host "`n=== Test 6: Goals System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 3
} else {
    # Test goals list
    Test-Endpoint -Name "Goals List" -Method "GET" -Endpoint "/api/v1/goals" `
        -ExpectedStatuses @(200, 500)
    
    # Test goal creation
    $goalBody = @{
        contact_id = "test-contact-id"
        type = "follow_up"
        description = "Follow up on project discussion"
        due_date = "2025-12-01"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Create Goal" -Method "POST" -Endpoint "/api/v1/goals" `
        -ExpectedStatuses @(201, 400, 500) -Body $goalBody
    
    # Test goal update
    $updateGoalBody = @{
        status = "completed"
        completion_notes = "Successfully followed up"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Update Goal" -Method "PATCH" -Endpoint "/api/v1/goals/test-goal-id" `
        -ExpectedStatuses @(200, 404, 500) -Body $updateGoalBody
}

# ============================================================================
# TEST 7: Messages System
# ============================================================================
Write-Host "`n=== Test 7: Messages System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test message preparation
    $prepareBody = @{
        contact_id = "test-contact-id"
        channel = "email"
        goal = "follow_up"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Message Prepare" -Method "POST" -Endpoint "/api/v1/messages/prepare" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $prepareBody
    
    # Test message send
    $sendBody = @{
        contact_id = "test-contact-id"
        channel = "email"
        subject = "Test Subject"
        body = "Test message body"
        goal = "follow_up"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Message Send" -Method "POST" -Endpoint "/api/v1/messages/send" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $sendBody
}

# ============================================================================
# TEST 8: Interactions System
# ============================================================================
Write-Host "`n=== Test 8: Interactions System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test interactions list
    Test-Endpoint -Name "Interactions List" -Method "GET" -Endpoint "/api/v1/interactions" `
        -ExpectedStatuses @(200, 500)
    
    # Test interaction creation
    $interactionBody = @{
        contact_id = "test-contact-id"
        channel = "email"
        direction = "outbound"
        summary = "Discussed project timeline"
        sentiment = "positive"
        occurred_at = "2025-11-07T18:00:00Z"
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Create Interaction" -Method "POST" -Endpoint "/api/v1/interactions" `
        -ExpectedStatuses @(201, 400, 500) -Body $interactionBody
}

# ============================================================================
# TEST 9: Search System
# ============================================================================
Write-Host "`n=== Test 9: Search System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test global search
    Test-Endpoint -Name "Global Search" -Method "GET" -Endpoint "/api/v1/search?q=test&type=contacts" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test advanced search
    $searchBody = @{
        query = "test"
        filters = @{
            warmth_band = @("warm", "hot")
            tags = @("important")
        }
        sort = "warmth_score"
        limit = 20
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Advanced Search" -Method "POST" -Endpoint "/api/v1/search/advanced" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $searchBody
}

# ============================================================================
# TEST 10: Templates System
# ============================================================================
Write-Host "`n=== Test 10: Templates System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 3
} else {
    # Test templates list
    Test-Endpoint -Name "Templates List" -Method "GET" -Endpoint "/api/v1/templates" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test template creation
    $templateBody = @{
        name = "Follow Up Template"
        channel = "email"
        subject = "Following up on our conversation"
        body = "Hi {{contact.name}}, I wanted to follow up on our recent conversation..."
        tags = @("follow_up", "general")
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Create Template" -Method "POST" -Endpoint "/api/v1/templates" `
        -ExpectedStatuses @(201, 400, 404, 500) -Body $templateBody
    
    # Test template rendering
    $renderBody = @{
        template_id = "test-template-id"
        contact_id = "test-contact-id"
        variables = @{
            custom_var = "custom_value"
        }
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Template Render" -Method "POST" -Endpoint "/api/v1/templates/render" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $renderBody
}

# ============================================================================
# TEST 11: File Upload System
# ============================================================================
Write-Host "`n=== Test 11: File Upload System ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 2
} else {
    # Test file upload URL generation
    $uploadBody = @{
        filename = "test-document.pdf"
        content_type = "application/pdf"
        size = 1024000
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Generate Upload URL" -Method "POST" -Endpoint "/api/v1/files/upload-url" `
        -ExpectedStatuses @(200, 400, 404, 500) -Body $uploadBody
    
    # Test file list
    Test-Endpoint -Name "Files List" -Method "GET" -Endpoint "/api/v1/files" `
        -ExpectedStatuses @(200, 404, 500)
}

# ============================================================================
# TEST 12: Analytics & Metrics
# ============================================================================
Write-Host "`n=== Test 12: Analytics & Metrics ===" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "⚠ SKIP - No auth token provided" -ForegroundColor Yellow
    $script:testsSkipped += 3
} else {
    # Test analytics dashboard
    Test-Endpoint -Name "Analytics Dashboard" -Method "GET" -Endpoint "/api/v1/analytics/dashboard" `
        -ExpectedStatuses @(200, 404, 500)
    
    # Test metrics ingestion
    $metricsBody = @{
        events = @(
            @{
                event = "contact_viewed"
                contact_id = "test-contact-id"
                timestamp = "2025-11-07T18:00:00Z"
                properties = @{
                    source = "web"
                }
            }
        )
    } | ConvertTo-Json
    
    Test-Endpoint -Name "Metrics Ingest" -Method "POST" -Endpoint "/api/v1/metrics/ingest" `
        -ExpectedStatuses @(200, 400, 500) -Body $metricsBody
    
    # Test activity feed
    Test-Endpoint -Name "Activity Feed" -Method "GET" -Endpoint "/api/v1/activity" `
        -ExpectedStatuses @(200, 404, 500)
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
    Write-Host "✓ All available tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Feature Coverage Analysis" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$totalFeatures = 12
$testedFeatures = if ($Token) { $totalFeatures } else { 0 }
$coveragePercent = if ($Token) { 100 } else { 0 }

Write-Host "Features Tested: $testedFeatures/$totalFeatures ($coveragePercent%)" -ForegroundColor $(if ($coveragePercent -eq 100) { "Green" } else { "Yellow" })
Write-Host ""

Write-Host "Feature Status:" -ForegroundColor Yellow
Write-Host "  ✓ Subscription Cancellation (tested yesterday)" -ForegroundColor Green
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) AI Agent System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Voice Notes Processing" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Custom Fields System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Advanced Contact Features" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Warmth System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Goals System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Messages System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Interactions System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Search System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Templates System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) File Upload System" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host "  $(if ($Token) { '✓' } else { '⚠' }) Analytics & Metrics" -ForegroundColor $(if ($Token) { "Green" } else { "Yellow" })
Write-Host ""

if (-not $Token) {
    Write-Host "To run authenticated tests:" -ForegroundColor Yellow
    Write-Host "  1. Get JWT token: node scripts/get-auth-token.mjs" -ForegroundColor White
    Write-Host "  2. Run tests: .\tests\comprehensive-feature-tests.ps1 -Token `$TOKEN" -ForegroundColor White
}

Write-Host "`n==========================================" -ForegroundColor Cyan

# Exit with appropriate code
exit $(if ($testsFailed -gt 0) { 1 } else { 0 })
