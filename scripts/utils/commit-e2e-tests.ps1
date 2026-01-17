# Commit E2E Tests and Legal Pages
# PowerShell script for committing files

$commitMessage = "Add comprehensive E2E tests and legal pages

- Add 5 new E2E test files covering missing workflows
  - Warmth tracking before/after messages
  - Complete contact lifecycle (all features)
  - Trial expiration and billing
  - Multi-channel campaigns
  - Screenshot analysis workflow
  
- Add test runner and npm scripts
- Add legal pages for Twilio verification (privacy, terms, sms-consent)
- Total: ~2,400 lines of new E2E test code"

Write-Host "Committing files..." -ForegroundColor Green
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Commit successful!" -ForegroundColor Green
    Write-Host "`nTo push to remote:" -ForegroundColor Yellow
    Write-Host "  git push origin feat/backend-vercel-only-clean" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Commit failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}
