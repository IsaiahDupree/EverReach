$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repair Schema & Complete Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

Write-Host "Step 1: Adding missing column..." -ForegroundColor Yellow
Write-Host ""

$repairSQL = @"
-- Add missing column to persona_notes
DO `$`$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persona_notes' AND column_name = 'linked_contacts'
    ) THEN
        ALTER TABLE persona_notes ADD COLUMN linked_contacts UUID[];
        RAISE NOTICE 'Added linked_contacts column';
    ELSE
        RAISE NOTICE 'linked_contacts column already exists';
    END IF;
END `$`$;
"@

Write-Output $repairSQL | & supabase db execute

Write-Host ""
Write-Host "Step 2: Pushing migration to mark as complete..." -ForegroundColor Yellow
Write-Host ""

& supabase db push -p "everreach123!@#"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify
    Write-Host "Verifying tables exist..." -ForegroundColor Yellow
    $verifySQL = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@
    
    Write-Output $verifySQL | & supabase db execute
    
    Write-Host ""
    Write-Host "✅ Ready to test! Run:" -ForegroundColor Green
    Write-Host "  node test/profile-smoke.mjs" -ForegroundColor Gray
    
} else {
    Write-Host ""
    Write-Host "⚠️  Migration may still have issues" -ForegroundColor Yellow
    Write-Host "But the schema should be repaired. Try smoke tests anyway." -ForegroundColor Gray
}
