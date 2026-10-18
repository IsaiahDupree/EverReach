$env:PGPASSWORD = "everreach123!@#"
psql "postgresql://postgres@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres" -f "supabase\migrations\20250119001200_production_campaigns.sql"
