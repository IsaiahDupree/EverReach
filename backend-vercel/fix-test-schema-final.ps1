# Final Schema Fix - Remove slug column references

Write-Host "🔧 Final Test Schema Fix" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$testFiles = @(
    "__tests__/api/public-api-auth.test.ts",
    "__tests__/api/public-api-context-bundle.test.ts",
    "__tests__/api/public-api-rate-limit.test.ts",
    "__tests__/api/public-api-webhooks.test.ts"
)

foreach ($file in $testFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "📝 Processing: $file" -ForegroundColor Cyan
    
    $content = Get-Content $file -Raw
    
    # Remove slug lines from org inserts
    $content = $content -replace ",\s*slug:\s*`[^`]+`", ""
    
    # Also fix organization_id to org_id
    $content = $content -replace 'organization_id:', 'org_id:'
    $content = $content -replace [regex]::Escape(".eq('organization_id',"), ".eq('org_id',"
    
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✅ Fixed schema" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "✅ Schema Fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor White
Write-Host "  - Removed slug column references" -ForegroundColor Gray
Write-Host "  - Fixed organization_id → org_id" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: npm run test:public-api" -ForegroundColor Cyan
Write-Host ""
