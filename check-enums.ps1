$env:PGPASSWORD = "everreach123!@#"

Write-Host "Checking channel enum values..." -ForegroundColor Cyan
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -c "SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'channel' ORDER BY e.enumsortorder;"

Write-Host "`nChecking user_event table columns..." -ForegroundColor Cyan  
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_event' AND column_name IN ('source', 'etype');"
