# Fix templates table schema

Write-Host "Fixing templates table schema...`n" -ForegroundColor Cyan

$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$PORT = "5432"
$DATABASE = "postgres"
$USER = "postgres"

Write-Host "Dropping and recreating templates table..." -ForegroundColor Yellow

$SQL = @"
-- Drop old templates table
DROP TABLE IF EXISTS templates CASCADE;

-- Recreate with correct schema
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_key text NOT NULL DEFAULT 'A',
  
  -- Email
  subject text,
  body_md text,
  preheader text,
  
  -- SMS
  sms_text text,
  
  -- Push
  push_title text,
  push_body text,
  
  -- Video script
  video_script_md text,
  
  -- Deep link params
  deep_link_path text,
  deep_link_params jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campaign_id, variant_key)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read templates" ON templates FOR SELECT USING (true);
CREATE POLICY "Service role manage templates" ON templates FOR ALL USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE templates IS 'A/B test variants for campaigns';
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS - templates table fixed`n" -ForegroundColor Green
    
    Write-Host "Now run production campaigns migration:" -ForegroundColor Yellow
    Write-Host "  Get-Content run-migrations-direct.ps1 | powershell -Command -`n" -ForegroundColor White
} else {
    Write-Host "FAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
}

$env:PGPASSWORD = ""
