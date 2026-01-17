$env:PGPASSWORD = "everreach123!@#"

Write-Host "Running Marketing Intelligence Schema..." -ForegroundColor Cyan
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f backend-vercel/migrations/marketing-intelligence-schema.sql

Write-Host "`nSchema deployment complete!" -ForegroundColor Green
