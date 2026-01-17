$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04"
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"
$env:BACKEND_URL = "https://ever-reach-be.vercel.app"
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "Frogger12"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🧪 WARMTH SCORE TEST SUITE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = 0
$passedTests = 0
$failedTests = 0

# Test 1: Continuity Test
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST SUITE 1: Warmth Continuity (Mode Switching)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

node test-warmth-continuity-improved.mjs
$continuityResult = $LASTEXITCODE

if ($continuityResult -eq 0) {
    Write-Host "Continuity Test: PASSED" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "Continuity Test: FAILED" -ForegroundColor Red
    $failedTests++
}
$totalTests++

Write-Host ""
Write-Host ""

# Test 2: Interactions Test
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST SUITE 2: Warmth + Interactions" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

node test-warmth-interactions.mjs
$interactionResult = $LASTEXITCODE

if ($interactionResult -eq 0) {
    Write-Host "Interactions Test: PASSED" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "Interactions Test: FAILED" -ForegroundColor Red
    $failedTests++
}
$totalTests++

Write-Host ""
Write-Host ""

# Test 3: Message Sent Test
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST SUITE 3: Warmth + Message Sent" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

node test-warmth-message-sent.mjs
$messageSentResult = $LASTEXITCODE

if ($messageSentResult -eq 0) {
    Write-Host "Message Sent Test: PASSED" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "Message Sent Test: FAILED" -ForegroundColor Red
    $failedTests++
}
$totalTests++

Write-Host ""
Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "FINAL TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Total Test Suites: $totalTests"
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)
Write-Host "Success Rate: $successRate%"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($failedTests -gt 0) {
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
}
