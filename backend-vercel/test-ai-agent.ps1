# Comprehensive AI Agent Testing
# Tests all AI agent endpoints with proper inputs

param(
    [string]$Token = (Get-Content "test-token.txt" -ErrorAction SilentlyContinue)
)

if (-not $Token) {
    Write-Host "❌ No token found. Run .\get-test-token.ps1 first" -ForegroundColor Red
    exit 1
}

$baseUrl = "https://ever-reach-be.vercel.app"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AI Agent Comprehensive Testing" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ============================================================================
# TEST 1: List Available Tools
# ============================================================================
Write-Host "`n🔧 TEST 1: List Available Agent Tools" -ForegroundColor Magenta

try {
    $tools = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/agent/tools" `
        -Headers $headers
    
    Write-Host "✅ Success! Available tools:" -ForegroundColor Green
    $tools | ForEach-Object {
        Write-Host "   - $($_.name): $($_.description)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# TEST 2: Simple Chat
# ============================================================================
Write-Host "`n💬 TEST 2: Simple Chat Message" -ForegroundColor Magenta

try {
    $chatBody = @{
        message = "Hello! Can you help me draft a professional email?"
    } | ConvertTo-Json

    $chatResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/agent/chat" `
        -Method POST `
        -Headers $headers `
        -Body $chatBody
    
    Write-Host "✅ Success! Agent response:" -ForegroundColor Green
    Write-Host $chatResponse.response -ForegroundColor White
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# TEST 3: Voice Note Processing
# ============================================================================
Write-Host "`n🎤 TEST 3: Process Voice Note" -ForegroundColor Magenta

try {
    $voiceNoteBody = @{
        transcript = "I had a great meeting with Sarah Johnson today. She's the CEO of TechCorp and is very interested in our product. We discussed pricing and she wants to schedule a demo for next Tuesday at 2 PM. She seemed particularly excited about the AI features. I should follow up with her tomorrow with the demo link."
    } | ConvertTo-Json

    $voiceResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/agent/voice-note/process" `
        -Method POST `
        -Headers $headers `
        -Body $voiceNoteBody
    
    Write-Host "✅ Success! Voice note analysis:" -ForegroundColor Green
    Write-Host "Contacts mentioned: $($voiceResponse.contacts -join ', ')" -ForegroundColor Gray
    Write-Host "Actions suggested: $($voiceResponse.actions -join ', ')" -ForegroundColor Gray
    Write-Host "Sentiment: $($voiceResponse.sentiment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# ============================================================================
# TEST 4: Smart Message Composition
# ============================================================================
Write-Host "`n✍️  TEST 4: Smart Message Composition" -ForegroundColor Magenta

try {
    # First, get a contact to compose to
    $contacts = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/contacts?limit=1" `
        -Headers $headers
    
    if ($contacts.data -and $contacts.data.Count -gt 0) {
        $contactId = $contacts.data[0].id
        $contactName = $contacts.data[0].display_name
        
        Write-Host "📧 Composing message to: $contactName" -ForegroundColor Gray
        
        $composeBody = @{
            contactId = $contactId
            goal = "re-engage"
            channel = "email"
            context = "Following up on our last conversation"
        } | ConvertTo-Json

        $composeResponse = Invoke-RestMethod `
            -Uri "$baseUrl/api/v1/agent/compose/smart" `
            -Method POST `
            -Headers $headers `
            -Body $composeBody
        
        Write-Host "✅ Success! Generated message:" -ForegroundColor Green
        Write-Host $composeResponse.message -ForegroundColor White
    } else {
        Write-Host "⚠️  No contacts found to test with" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# TEST 5: Contact Analysis
# ============================================================================
Write-Host "`n🔍 TEST 5: Contact Analysis" -ForegroundColor Magenta

try {
    $contacts = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/contacts?limit=1" `
        -Headers $headers
    
    if ($contacts.data -and $contacts.data.Count -gt 0) {
        $contactId = $contacts.data[0].id
        $contactName = $contacts.data[0].display_name
        
        Write-Host "🔎 Analyzing contact: $contactName" -ForegroundColor Gray
        
        $analysisResponse = Invoke-RestMethod `
            -Uri "$baseUrl/api/v1/agent/analyze/contact?contactId=$contactId" `
            -Headers $headers
        
        Write-Host "✅ Success! Analysis:" -ForegroundColor Green
        Write-Host "Relationship health: $($analysisResponse.relationship_health)" -ForegroundColor Gray
        Write-Host "Engagement level: $($analysisResponse.engagement_level)" -ForegroundColor Gray
        Write-Host "Suggestions: $($analysisResponse.suggestions -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  No contacts found to analyze" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# TEST 6: Action Suggestions
# ============================================================================
Write-Host "`n💡 TEST 6: Get Action Suggestions" -ForegroundColor Magenta

try {
    $suggestBody = @{
        context = "weekly_review"
    } | ConvertTo-Json

    $suggestions = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/agent/suggest/actions" `
        -Method POST `
        -Headers $headers `
        -Body $suggestBody
    
    Write-Host "✅ Success! Suggested actions:" -ForegroundColor Green
    $suggestions | ForEach-Object {
        Write-Host "   - $($_.action): $($_.reason)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# ============================================================================
# TEST 7: Streaming Chat
# ============================================================================
Write-Host "`n🌊 TEST 7: Streaming Chat (SSE)" -ForegroundColor Magenta

Write-Host "⚠️  Streaming test requires special handling - skipping for now" -ForegroundColor Yellow
Write-Host "   Endpoint: POST $baseUrl/api/v1/agent/chat/stream" -ForegroundColor Gray

# ============================================================================
# TEST 8: OpenAI Integration
# ============================================================================
Write-Host "`n🤖 TEST 8: OpenAI Integration" -ForegroundColor Magenta

try {
    $models = Invoke-RestMethod `
        -Uri "$baseUrl/api/v1/openai/models" `
        -Headers $headers
    
    Write-Host "✅ Success! Available models:" -ForegroundColor Green
    $models | ForEach-Object {
        Write-Host "   - $_" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AI AGENT TEST SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n✅ Tests Completed!" -ForegroundColor Green
Write-Host "`n📊 Results:" -ForegroundColor Cyan
Write-Host "   - Agent Tools: Check above" -ForegroundColor Gray
Write-Host "   - Chat: Check above" -ForegroundColor Gray
Write-Host "   - Voice Notes: Check above" -ForegroundColor Gray
Write-Host "   - Composition: Check above" -ForegroundColor Gray
Write-Host "   - Analysis: Check above" -ForegroundColor Gray
Write-Host "   - Suggestions: Check above" -ForegroundColor Gray
Write-Host "   - OpenAI: Check above" -ForegroundColor Gray

Write-Host ""
