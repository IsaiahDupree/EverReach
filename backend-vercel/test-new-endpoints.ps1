# Test New Endpoints After Deployment
Write-Host "🧪 Testing New Endpoints..." -ForegroundColor Cyan
Write-Host ""

$API_BASE = "https://ever-reach-be.vercel.app"

# Test 1: Warmth Bands (Public endpoint - no auth needed)
Write-Host "1. Testing GET /v1/warmth/bands (public)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/v1/warmth/bands" -Method GET
    if ($response.bands) {
        Write-Host "   ✅ Warmth bands endpoint working" -ForegroundColor Green
        Write-Host "   Bands returned: $($response.bands.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ No bands in response" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Check if persona-notes returns contact_id
Write-Host "2. Testing voice notes contact_id fix" -ForegroundColor Yellow
Write-Host "   (Requires authentication - skipping for now)" -ForegroundColor Gray
Write-Host "   Manual test: Create voice note with contact_id and verify response" -ForegroundColor Gray

Write-Host ""

# Test 3: Check deployment status
Write-Host "3. Checking Vercel deployment status..." -ForegroundColor Yellow
Write-Host "   Visit: https://vercel.com/isaiah-duprees-projects/ever-reach-be" -ForegroundColor Blue

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for Vercel deployment to complete" -ForegroundColor Gray
Write-Host "   2. Test authenticated endpoints with valid token:" -ForegroundColor Gray
Write-Host "      - GET /v1/me/trial-stats" -ForegroundColor DarkGray
Write-Host "      - GET /v1/me/eligibility/trial" -ForegroundColor DarkGray
Write-Host "      - POST /v1/sessions/start" -ForegroundColor DarkGray
Write-Host "   3. Test voice notes with contact_id" -ForegroundColor Gray
Write-Host ""
