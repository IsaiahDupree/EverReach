#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Developer Dashboard to Vercel

.DESCRIPTION
    Deploys the dashboard backend to Vercel production

.EXAMPLE
    .\scripts\deploy-dashboard.ps1
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
Write-Host "${Blue}  Developer Dashboard - Vercel Deployment${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

# Check if vercel CLI is installed
Write-Host "${Cyan}Checking Vercel CLI...${Reset}"
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "${Red}✗ Vercel CLI not found${Reset}"
    Write-Host "${Yellow}Install with: npm install -g vercel${Reset}`n"
    exit 1
}
Write-Host "${Green}✓ Vercel CLI found${Reset}`n"

# Ensure we're on the right branch
Write-Host "${Cyan}Checking branch...${Reset}"
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: ${Blue}$currentBranch${Reset}`n"

# Pull latest changes
Write-Host "${Cyan}Pulling latest changes...${Reset}"
git pull origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}✗ Failed to pull latest changes${Reset}`n"
    exit 1
}
Write-Host "${Green}✓ Up to date${Reset}`n"

# Deploy to Vercel
Write-Host "${Cyan}Deploying to Vercel...${Reset}"
Write-Host "${Yellow}This may take a few minutes...${Reset}`n"

vercel --prod --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n${Red}✗ Deployment failed${Reset}`n"
    exit 1
}

Write-Host "`n${Green}✓ Deployment successful!${Reset}`n"

# Get deployment URL
Write-Host "${Cyan}Getting deployment URL...${Reset}"
$deploymentInfo = vercel ls --prod 2>&1 | Select-Object -First 10
Write-Host $deploymentInfo

Write-Host "`n${Blue}════════════════════════════════════════════════════════${Reset}"
Write-Host "${Green}  Deployment Complete!${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════════${Reset}`n"

Write-Host "${Cyan}Next steps:${Reset}"
Write-Host "1. Configure environment variables in Vercel dashboard"
Write-Host "2. Enable Vercel Cron (if not already enabled)"
Write-Host "3. Test the deployment"
Write-Host "4. Run: ${Blue}.\scripts\test-dashboard-deployment.ps1${Reset}`n"
