$env:API_BASE = "https://ever-reach-be.vercel.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Personal Profile Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Base: $env:API_BASE" -ForegroundColor Gray
Write-Host ""

node test/profile-smoke.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All smoke tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed" -ForegroundColor Red
}
