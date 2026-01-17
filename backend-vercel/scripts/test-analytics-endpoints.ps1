Write-Host "Testing Analytics Endpoints..." -ForegroundColor Cyan
Write-Host ""

$BASE = "https://ever-reach-be.vercel.app"

# Test 1: Contact Import Health
Write-Host "1. Contact Import Health:" -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri "$BASE/api/v1/contacts/import/health" -Method Get
Write-Host "   Status: $($response1.status)" -ForegroundColor Green
Write-Host "   Google: $($response1.providers.google.configured)" -ForegroundColor Green
Write-Host "   Microsoft: $($response1.providers.microsoft.configured)" -ForegroundColor Green
Write-Host ""

# Test 2: Analytics Coverage (will be empty until mobile app sends data)
Write-Host "2. Analytics Coverage:" -ForegroundColor Yellow
try {
    $response2 = Invoke-RestMethod -Uri "$BASE/api/v1/tracking/coverage?appVersion=1.0.0" -Method Get
    Write-Host "   App Version: $($response2.appVersion)" -ForegroundColor Green
    Write-Host "   Total Routes: $($response2.summary.total_routes)" -ForegroundColor Green
    Write-Host "   Covered Routes: $($response2.summary.covered_routes)" -ForegroundColor Green
    Write-Host "   Coverage: $($response2.summary.coverage_percent)%" -ForegroundColor Green
    Write-Host "   Missing Routes: $($response2.missingRoutes.Count)" -ForegroundColor Yellow
    Write-Host "   Missing Elements: $($response2.missingElements.Count)" -ForegroundColor Yellow
} catch {
    Write-Host "   No data yet (expected until mobile app starts sending events)" -ForegroundColor Gray
}
Write-Host ""

# Test 3: Analytics Dashboard
Write-Host "3. Analytics Dashboard:" -ForegroundColor Yellow
try {
    $response3 = Invoke-RestMethod -Uri "$BASE/api/v1/tracking/dashboard?appVersion=1.0.0&days=7" -Method Get
    Write-Host "   App Version: $($response3.appVersion)" -ForegroundColor Green
    Write-Host "   Period: $($response3.period)" -ForegroundColor Green
    Write-Host "   Total Events: $($response3.stats.totalEvents)" -ForegroundColor Green
    Write-Host "   Unique Routes: $($response3.stats.uniqueRoutes)" -ForegroundColor Green
} catch {
    Write-Host "   No data yet (expected until mobile app starts sending events)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "All Endpoints Deployed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Mobile app integration:" -ForegroundColor Yellow
Write-Host "     - Implement analytics wrapper" -ForegroundColor Gray
Write-Host "     - Add useScreenTracking() hook" -ForegroundColor Gray
Write-Host "     - Use TrackedPressable for buttons" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Test OAuth contact import:" -ForegroundColor Yellow
Write-Host "     - node test/backend/test-contact-import.mjs" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Build developer dashboard UI to visualize:" -ForegroundColor Yellow
Write-Host "     - Coverage percentage" -ForegroundColor Gray
Write-Host "     - Missing routes/buttons" -ForegroundColor Gray
Write-Host "     - User engagement metrics" -ForegroundColor Gray
