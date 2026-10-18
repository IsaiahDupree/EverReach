$env:PGPASSWORD = "everreach123!@#"
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f seed-sample-data-fixed.sql
