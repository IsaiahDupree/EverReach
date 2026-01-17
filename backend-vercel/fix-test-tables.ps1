# Fix Test Files to Use Correct Table Names
# The actual schema uses: orgs (not organizations) and contacts (not people)

Write-Host "🔧 Fixing Test Table Names" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
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
    
    # Replace table names
    $content = $content -replace "\.from\('organizations'\)", ".from('orgs')"
    $content = $content -replace "\.from\('people'\)", ".from('contacts')"
    
    Set-Content $file -Value $content -NoNewline
    Write-Host "   ✅ Fixed table names" -ForegroundColor Green
}

Write-Host ""
Write-Host "===========================" -ForegroundColor Cyan
Write-Host "✅ Table Names Fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor White
Write-Host "  - organizations → orgs" -ForegroundColor Gray
Write-Host "  - people → contacts" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: npm run test:public-api" -ForegroundColor Cyan
Write-Host ""
