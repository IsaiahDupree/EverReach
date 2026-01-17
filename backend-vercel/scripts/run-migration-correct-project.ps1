$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Migration (Correct Project)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Correct credentials
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

Write-Host "Project: utasetfxiqcrnwyfforx" -ForegroundColor Yellow
Write-Host ""

# Step 1: Link to correct project
Write-Host "Step 1: Linking to correct project..." -ForegroundColor Yellow
& supabase link --project-ref utasetfxiqcrnwyfforx -p "everreach123!@#"

Write-Host ""
Write-Host "Step 2: Listing current migrations..." -ForegroundColor Yellow
Get-ChildItem "supabase\migrations\*.sql" | ForEach-Object {
    Write-Host "  • $($_.Name)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 3: Pushing migrations..." -ForegroundColor Yellow
Write-Host ""

& supabase db push -p "everreach123!@#"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Verifying schema..." -ForegroundColor Yellow
    
    # Run verification
    $verifySQL = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@
    
    Write-Output $verifySQL | & supabase db execute
    
    Write-Host ""
    Write-Host "Next: Run smoke tests" -ForegroundColor Cyan
    Write-Host "  node test/profile-smoke.mjs" -ForegroundColor Gray
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed - see output above" -ForegroundColor Red
}
