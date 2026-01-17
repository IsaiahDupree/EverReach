# Automated Test Schema Fix Script
# Fixes schema mismatches in all public API test files

Write-Host "🔧 Fixing Test Schema Mismatches" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$testFiles = @(
    "__tests__/api/public-api-auth.test.ts",
    "__tests__/api/public-api-context-bundle.test.ts",
    "__tests__/api/public-api-rate-limit.test.ts",
    "__tests__/api/public-api-webhooks.test.ts"
)

$replacements = @(
    @{
        Pattern = "\.from\('contacts'\)"
        Replacement = ".from('people')"
        Description = "Table name: contacts → people"
    },
    @{
        Pattern = "org_id:"
        Replacement = "organization_id:"
        Description = "Column name in objects: org_id → organization_id"
    },
    @{
        Pattern = "\.eq\('org_id',"
        Replacement = ".eq('organization_id',"
        Description = "Column name in queries: org_id → organization_id"
    },
    @{
        Pattern = "\.select\('org_id'\)"
        Replacement = ".select('organization_id')"
        Description = "Column name in selects: org_id → organization_id"
    },
    @{
        Pattern = "contact_id:"
        Replacement = "person_id:"
        Description = "Foreign key: contact_id → person_id (if needed)"
    },
    @{
        Pattern = "name: 'Test Contact'"
        Replacement = "full_name: 'Test Contact'"
        Description = "Field name for people: name → full_name"
    },
    @{
        Pattern = "name: 'Test"
        Replacement = "full_name: 'Test"
        Description = "Field name for people: name → full_name (generic)"
    }
)

$totalChanges = 0

foreach ($file in $testFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "📝 Processing: $file" -ForegroundColor Cyan
    
    $content = Get-Content $file -Raw
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($replacement in $replacements) {
        $pattern = [regex]::Escape($replacement.Pattern)
        $matches = [regex]::Matches($content, $pattern)
        
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern, $replacement.Replacement
            $fileChanges += $matches.Count
            Write-Host "   ✅ $($replacement.Description): $($matches.Count) changes" -ForegroundColor Green
        }
    }
    
    if ($fileChanges -gt 0) {
        Set-Content $file -Value $content -NoNewline
        $totalChanges += $fileChanges
        Write-Host "   📊 Total changes in file: $fileChanges" -ForegroundColor White
    } else {
        Write-Host "   ℹ️  No changes needed" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Schema Fix Complete!" -ForegroundColor Green
Write-Host "Total changes made: $totalChanges" -ForegroundColor White
Write-Host ""
Write-Host "Next step: Run tests" -ForegroundColor Yellow
Write-Host "  npm run test:public-api" -ForegroundColor Cyan
Write-Host ""
