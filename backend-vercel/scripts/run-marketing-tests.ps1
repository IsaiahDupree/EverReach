#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run Marketing Intelligence Tests
.DESCRIPTION
    Runs all marketing intelligence tests with proper setup and reporting
.EXAMPLE
    .\scripts\run-marketing-tests.ps1
#>

Write-Host "🧪 Marketing Intelligence Test Runner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from backend-vercel directory" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check environment variables
Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow
$envVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
)

$missingVars = @()
foreach ($var in $envVars) {
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "⚠️  Warning: Missing environment variables:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Tests may fail. Set these in .env.test or environment" -ForegroundColor Yellow
    Write-Host ""
}

# Run tests
Write-Host "🚀 Running marketing tests..." -ForegroundColor Green
Write-Host ""

$testCommand = "npm run test:marketing"

# Parse arguments
$coverage = $false
$watch = $false
$suite = $null

foreach ($arg in $args) {
    switch ($arg) {
        "--coverage" { $coverage = $true }
        "-c" { $coverage = $true }
        "--watch" { $watch = $true }
        "-w" { $watch = $true }
        "--enrichment" { $suite = "enrichment" }
        "--analytics" { $suite = "analytics" }
        "--calculators" { $suite = "calculators" }
        "--admin" { $suite = "admin" }
    }
}

# Build test command
if ($coverage) {
    $testCommand = "npm run test:marketing:coverage"
} elseif ($watch) {
    $testCommand = "npm run test:marketing:watch"
} elseif ($suite) {
    $testCommand = "npm run test:marketing:$suite"
}

Write-Host "📝 Running: $testCommand" -ForegroundColor Cyan
Write-Host ""

# Execute tests
Invoke-Expression $testCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host ""
    
    if ($coverage) {
        Write-Host "📊 Coverage report generated in coverage/ directory" -ForegroundColor Cyan
        Write-Host "   Open coverage/lcov-report/index.html to view" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "❌ Tests failed" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "💡 Tip: Run with --coverage to see test coverage" -ForegroundColor Gray
Write-Host "💡 Tip: Run with --watch for development mode" -ForegroundColor Gray
Write-Host "💡 Tip: Run with --enrichment, --analytics, --calculators, or --admin for specific suite" -ForegroundColor Gray
Write-Host ""
