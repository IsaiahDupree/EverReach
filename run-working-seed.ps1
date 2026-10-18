$env:PGPASSWORD = "everreach123!@#"
Write-Host "Running seed with correct enum values..." -ForegroundColor Cyan
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f seed-working.sql
Write-Host "`n✅ Seed complete!" -ForegroundColor Green
