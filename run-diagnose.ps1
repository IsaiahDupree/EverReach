$env:PGPASSWORD = "everreach123!@#"

Write-Host "=== USER_EVENT TABLE STRUCTURE ===" -ForegroundColor Cyan
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f diagnose-db.sql -o diagnose-output.txt

Get-Content diagnose-output.txt
