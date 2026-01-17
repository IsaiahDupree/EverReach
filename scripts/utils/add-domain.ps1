# Add custom domain to e2e project
Write-Host "Adding www.everreach.app to e2e project..." -ForegroundColor Cyan
vercel domains add www.everreach.app

Write-Host "`nDomain added! DNS should already be configured." -ForegroundColor Green
Write-Host "Visit https://vercel.com/isaiahduprees-projects/e2e/settings/domains to verify." -ForegroundColor Yellow
