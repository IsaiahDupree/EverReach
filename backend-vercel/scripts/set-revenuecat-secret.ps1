$env:REVENUECAT_SECRET_KEY = "sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX"
$env:REVENUECAT_WEBHOOK_SECRET = $env:REVENUECAT_SECRET_KEY

Write-Host "✅ RevenueCat webhook secret set for current session" -ForegroundColor Green
Write-Host "REVENUECAT_SECRET_KEY = $($env:REVENUECAT_SECRET_KEY.Substring(0, 15))..." -ForegroundColor Gray
