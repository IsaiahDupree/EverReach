$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clean Duplicates & Run Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set credentials
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Step 1: Remove duplicate migrations
Write-Host "Step 1: Removing duplicate migrations..." -ForegroundColor Yellow

$duplicates = Get-ChildItem "supabase\migrations\202510261423*.sql"
$duplicates += Get-ChildItem "supabase\migrations\202510261430*.sql"
$duplicates += Get-ChildItem "supabase\migrations\202510261432*.sql"

foreach ($file in $duplicates) {
    Write-Host "  Removing: $($file.Name)" -ForegroundColor Gray
    Remove-Item $file.FullName -Force
}

Write-Host "  ✓ Duplicates removed" -ForegroundColor Green
Write-Host ""

# Step 2: Check remaining migrations
Write-Host "Step 2: Remaining migrations:" -ForegroundColor Yellow
Get-ChildItem "supabase\migrations\*.sql" | ForEach-Object {
    Write-Host "  • $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Push migrations
Write-Host "Step 3: Pushing migrations..." -ForegroundColor Yellow
Write-Host ""

& supabase db push --password "everreach123!@#"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify tables
    Write-Host "Verifying tables..." -ForegroundColor Yellow
    $verifySQL = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@
    
    $verifySQL | & supabase db execute --password "everreach123!@#"
    
    Write-Host ""
    Write-Host "✅ Done! Run smoke tests with:" -ForegroundColor Cyan
    Write-Host "  node test/profile-smoke.mjs" -ForegroundColor Gray
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
