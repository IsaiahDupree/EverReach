# Test Deployment Script
# Run after Vercel deployment completes

$BACKEND_URL = "https://ever-reach-be.vercel.app"

Write-Host "🧪 Testing EverReach Backend Deployment" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BACKEND_URL/api/health" -Method Get
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($health.status)"
    Write-Host ""
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Developer Notifications API
Write-Host "2️⃣ Testing dev notifications API..." -ForegroundColor Yellow
try {
    $devNotifs = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/dev-notifications?hours=24" -Method Get
    Write-Host "✅ Dev notifications API working" -ForegroundColor Green
    Write-Host "   Total events: $($devNotifs.stats.total_events)"
    Write-Host "   Unique users: $($devNotifs.stats.unique_users)"
    Write-Host "   Signups: $($devNotifs.stats.by_type.signup_completed)"
    Write-Host "   Sessions: $($devNotifs.stats.by_type.session_started)"
    Write-Host ""
} catch {
    Write-Host "❌ Dev notifications failed: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Check cron configuration
Write-Host "3️⃣ Cron jobs to verify in Vercel dashboard:" -ForegroundColor Yellow
Write-Host "   • check-warmth-alerts (9 AM daily)"
Write-Host "   • sync-ai-context (2 AM daily)"
Write-Host "   • refresh-monitoring-views (every 5 min)"
Write-Host "   • dev-activity-digest (9 AM daily) ← NEW"
Write-Host ""

Write-Host "============================================================"
Write-Host "Deployment Test Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check Vercel dashboard: https://vercel.com/isaiahduprees-projects/backend-vercel"
Write-Host "2. Wait for 9 AM email digest to: isaiahdupree33@gmail.com"
Write-Host "3. Add production campaigns (separate commit)"
Write-Host "4. Run migration verification script"
Write-Host ""
