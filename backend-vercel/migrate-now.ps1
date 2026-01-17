Write-Host "Applying Supabase Migrations..." -ForegroundColor Cyan

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

Write-Host "Linking project..." -ForegroundColor Yellow
supabase link --project-ref utasetfxiqcrnwyfforx

Write-Host "Migration 1..." -ForegroundColor Cyan
supabase db execute --file "migrations/COMBINED_MIGRATIONS.sql" --password "zVTEbBqIF4f8Himv"

Write-Host "Migration 2..." -ForegroundColor Cyan
supabase db execute --file "migrations/trial_tracking_system.sql" --password "zVTEbBqIF4f8Himv"

Write-Host "Migration 3..." -ForegroundColor Cyan
supabase db execute --file "migrations/supporting_systems.sql" --password "zVTEbBqIF4f8Himv"

Write-Host "Done!" -ForegroundColor Green
