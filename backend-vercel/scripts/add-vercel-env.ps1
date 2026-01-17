$ErrorActionPreference = "Stop"

Write-Host "Adding REVENUECAT_SECRET_KEY to Vercel..." -ForegroundColor Cyan
Write-Host ""

$SECRET = "sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX"

Write-Host "This will add the environment variable to Production, Preview, and Development" -ForegroundColor Yellow
Write-Host ""

# Use echo to pipe the value to vercel env add
$SECRET | npx vercel env add REVENUECAT_SECRET_KEY production

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Environment variable added to Production" -ForegroundColor Green
    
    # Add to preview and development
    $SECRET | npx vercel env add REVENUECAT_SECRET_KEY preview
    $SECRET | npx vercel env add REVENUECAT_SECRET_KEY development
    
    Write-Host "✅ Environment variable added to all environments" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vercel will automatically redeploy with the new variable (2-3 minutes)" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Failed to add environment variable" -ForegroundColor Red
    Write-Host "Please add manually via Vercel dashboard:" -ForegroundColor Yellow
    Write-Host "https://vercel.com/dashboard → Settings → Environment Variables" -ForegroundColor Gray
}
