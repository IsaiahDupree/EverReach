# Complete CI/CD Script: Build, Deploy, and Test
# Automates the entire deployment and verification process

param(
    [switch]$SkipBuild,
    [switch]$SkipDeploy,
    [switch]$SkipTest
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Automated Build, Deploy & Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Pull latest code
if (-not $SkipBuild) {
    Write-Host "📥 Step 1: Pulling latest code..." -ForegroundColor Yellow
    git pull origin e2e
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Git pull failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Code updated" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Clean and rebuild
if (-not $SkipBuild) {
    Write-Host "🧹 Step 2: Cleaning build artifacts..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, .expo
    Write-Host "✅ Cleaned" -ForegroundColor Green
    Write-Host ""

    Write-Host "🔨 Step 3: Building web app..." -ForegroundColor Yellow
    npx expo export --platform web --clear
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build complete" -ForegroundColor Green
    Write-Host ""
}

# Step 3: Deploy to Vercel
if (-not $SkipDeploy) {
    Write-Host "🚀 Step 4: Deploying to Vercel..." -ForegroundColor Yellow
    vercel --prod
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Deployed successfully" -ForegroundColor Green
    Write-Host ""

    # Wait for deployment to be fully ready
    Write-Host "⏳ Waiting 10 seconds for deployment to stabilize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Step 4: Run E2E tests
if (-not $SkipTest) {
    Write-Host "🧪 Step 5: Running E2E tests..." -ForegroundColor Yellow
    Write-Host ""
    
    # Set test credentials
    $env:TEST_EMAIL = "isaiahdupree33@gmail.com"
    $env:TEST_PASSWORD = "Frogger12"
    $env:WEB_BASE_URL = "https://e2e-qkxs7ll7t-isaiahduprees-projects.vercel.app"
    
    npx playwright test -c test/frontend/playwright.config.ts --reporter=list
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Some tests failed, but deployment succeeded" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Pipeline Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production URL: https://e2e-qkxs7ll7t-isaiahduprees-projects.vercel.app" -ForegroundColor Cyan
Write-Host ""
