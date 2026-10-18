$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check RevenueCat Webhook Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "https://ever-reach-be.vercel.app"
$WEBHOOK_URL = "$API_BASE/api/v1/billing/revenuecat/webhook"

Write-Host "Checking webhook endpoint..." -ForegroundColor Yellow
Write-Host "URL: $WEBHOOK_URL" -ForegroundColor Gray
Write-Host ""

try {
    # Try OPTIONS request to check if endpoint exists
    $response = Invoke-WebRequest -Uri $WEBHOOK_URL -Method OPTIONS -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ Webhook endpoint is live!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "CORS Headers:" -ForegroundColor Cyan
    $response.Headers.GetEnumerator() | Where-Object { $_.Key -like "*Access-Control*" } | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Configure RevenueCat webhook in dashboard" -ForegroundColor Gray
    Write-Host "  2. Set webhook URL: $WEBHOOK_URL" -ForegroundColor Gray
    Write-Host "  3. Generate and save webhook secret" -ForegroundColor Gray
    Write-Host "  4. Run tests: .\scripts\test-revenuecat-webhook.ps1" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 405) {
        Write-Host "✅ Endpoint exists (405 Method Not Allowed for GET)" -ForegroundColor Green
        Write-Host "This is expected - webhook only accepts POST" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "❌ Webhook endpoint not accessible" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  - Vercel deployment still in progress" -ForegroundColor Gray
        Write-Host "  - Check: https://vercel.com/dashboard" -ForegroundColor Gray
        Write-Host ""
    }
}
