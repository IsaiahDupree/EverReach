#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run Developer Dashboard Migrations

.DESCRIPTION
    Runs all required migrations for the developer dashboard in the correct order

.EXAMPLE
    .\scripts\run-dashboard-migrations.ps1
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
Write-Host "${Blue}  Developer Dashboard - Database Migrations${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

Write-Host "${Cyan}This script will guide you through running the migrations.${Reset}`n"

# Check for Supabase CLI
Write-Host "${Cyan}Checking for Supabase CLI...${Reset}"
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "${Green}✓ Supabase CLI found${Reset}`n"
    
    Write-Host "${Yellow}Choose migration method:${Reset}"
    Write-Host "1. Run via Supabase CLI (requires local setup)"
    Write-Host "2. Manual - Copy/paste to Supabase Dashboard"
    $choice = Read-Host "`nEnter choice (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host "`n${Cyan}Running migrations via CLI...${Reset}`n"
        
        # Check if supabase is initialized
        if (Test-Path "supabase/config.toml") {
            Write-Host "${Green}✓ Supabase project initialized${Reset}`n"
            
            Write-Host "${Cyan}Running migration...${Reset}"
            supabase db push
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n${Green}✓ Migration successful!${Reset}`n"
            } else {
                Write-Host "`n${Red}✗ Migration failed${Reset}`n"
                exit 1
            }
        } else {
            Write-Host "${Yellow}⚠ Supabase not initialized locally${Reset}"
            Write-Host "${Yellow}Run: supabase init${Reset}"
            Write-Host "${Yellow}Then: supabase link --project-ref YOUR_PROJECT_REF${Reset}`n"
            exit 1
        }
    }
} else {
    Write-Host "${Yellow}⚠ Supabase CLI not found${Reset}"
    Write-Host "${Yellow}Install with: npm install -g supabase${Reset}`n"
}

# Manual instructions
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}"
Write-Host "${Cyan}  Manual Migration Steps${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

Write-Host "${Yellow}Step 1: Setup Workspace${Reset}"
Write-Host "1. Go to Supabase Dashboard → SQL Editor"
Write-Host "2. Copy content from: ${Cyan}scripts/setup-dashboard-workspace.sql${Reset}"
Write-Host "3. Paste and run"
Write-Host "4. Verify you see: 'Workspace setup complete! ✅'`n"

Write-Host "${Yellow}Step 2: Run Core Migration${Reset}"
Write-Host "1. In Supabase Dashboard → SQL Editor"
Write-Host "2. Copy content from: ${Cyan}supabase/migrations/20251102_dashboard_core.sql${Reset}"
Write-Host "3. Paste and run"
Write-Host "4. Should create 7 tables without errors`n"

Write-Host "${Yellow}Step 3: Verify Migration${Reset}"
Write-Host "Run this query in SQL Editor:"
Write-Host "${Cyan}"
Write-Host @"
-- Verify tables exist
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
Write-Host "${Reset}"

Write-Host "`n${Yellow}Expected: Should show all 7 tables${Reset}`n"

Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}"
Write-Host "${Green}  Quick Links${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

Write-Host "Workspace Setup SQL: ${Cyan}scripts/setup-dashboard-workspace.sql${Reset}"
Write-Host "Core Migration SQL:  ${Cyan}supabase/migrations/20251102_dashboard_core.sql${Reset}"
Write-Host "Supabase Dashboard:  ${Cyan}https://supabase.com/dashboard${Reset}`n"

Write-Host "${Green}After migration, run tests:${Reset}"
Write-Host "${Cyan}node test/backend/dashboard-e2e.mjs${Reset}`n"
