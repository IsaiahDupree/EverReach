#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run Dashboard Migrations Remotely

.DESCRIPTION
    Connects to Supabase and runs the dashboard migrations
#>

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}"
Write-Host "${Blue}  Running Dashboard Migrations${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

# Database connection details
$DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
$DB_PORT = "6543"
$DB_NAME = "postgres"
$DB_USER = "postgres.okwhafouhyutvveqnzsl"
$DB_PASSWORD = "everreach123!@#"

Write-Host "${Cyan}Step 1: Setting up workspace...${Reset}"

# Create workspace setup script
$workspaceSetup = @"
-- Developer Dashboard - Workspace Setup
INSERT INTO workspaces (id, name, created_at) 
VALUES (gen_random_uuid(), 'Production Workspace', now())
ON CONFLICT DO NOTHING;

DO `$`$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1;
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
  
  INSERT INTO profiles (user_id, workspace_id, display_name, created_at, updated_at)
  VALUES (v_user_id, v_workspace_id, 'Isaiah Dupree', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET workspace_id = v_workspace_id, updated_at = now();
  
  RAISE NOTICE 'Profile updated for user: %, workspace: %', v_user_id, v_workspace_id;
END `$`$;

SELECT 'Workspace setup complete!' as status;
"@

# Save to temp file
$tempWorkspace = [System.IO.Path]::GetTempFileName()
$workspaceSetup | Out-File -FilePath $tempWorkspace -Encoding UTF8

# Run workspace setup
Write-Host "${Cyan}Connecting to database...${Reset}"
$env:PGPASSWORD = $DB_PASSWORD

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $tempWorkspace

if ($LASTEXITCODE -eq 0) {
    Write-Host "${Green}✓ Workspace setup complete${Reset}`n"
} else {
    Write-Host "${Red}✗ Workspace setup failed${Reset}"
    Write-Host "${Yellow}Trying alternative method...${Reset}`n"
    
    # Try with supabase CLI
    Write-Host "${Cyan}Using Supabase CLI...${Reset}"
    Write-Host "${Yellow}Please run these commands manually in Supabase SQL Editor:${Reset}`n"
    Write-Host "1. Go to: ${Cyan}https://supabase.com/dashboard/project/okwhafouhyutvveqnzsl/sql${Reset}"
    Write-Host "2. Copy and run: ${Cyan}scripts/setup-dashboard-workspace.sql${Reset}"
    Write-Host "3. Then copy and run: ${Cyan}supabase/migrations/20251102_dashboard_core.sql${Reset}`n"
    
    Remove-Item $tempWorkspace
    exit 1
}

Write-Host "${Cyan}Step 2: Running core migration...${Reset}"

# Run core migration
$migrationFile = "supabase/migrations/20251102_dashboard_core.sql"

if (Test-Path $migrationFile) {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "${Green}✓ Core migration complete${Reset}`n"
    } else {
        Write-Host "${Red}✗ Migration failed${Reset}`n"
        Remove-Item $tempWorkspace
        exit 1
    }
} else {
    Write-Host "${Red}✗ Migration file not found: $migrationFile${Reset}`n"
    Remove-Item $tempWorkspace
    exit 1
}

# Verify migration
Write-Host "${Cyan}Step 3: Verifying tables...${Reset}"

$verifyQuery = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'integration_accounts',
    'service_status', 
    'metrics_timeseries',
    'dashboards',
    'events_ingest',
    'alerts',
    'alert_history'
  )
ORDER BY table_name;
"@

$tempVerify = [System.IO.Path]::GetTempFileName()
$verifyQuery | Out-File -FilePath $tempVerify -Encoding UTF8

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $tempVerify

Remove-Item $tempWorkspace
Remove-Item $tempVerify

Write-Host "`n${Green}════════════════════════════════════════════════════════${Reset}"
Write-Host "${Green}  Migration Complete!${Reset}"
Write-Host "${Green}════════════════════════════════════════════════════════${Reset}`n"

Write-Host "${Cyan}Next steps:${Reset}"
Write-Host "1. Run tests: ${Yellow}node test/backend/dashboard-e2e.mjs${Reset}"
Write-Host "2. Test health endpoint: ${Yellow}curl https://ever-reach-be.vercel.app/api/integrations/health${Reset}`n"
