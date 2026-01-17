$headers = @{
    "Authorization" = "Bearer xqYZOodCZ74DdEQbU8N0fayL"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Creating Deploy Hook for feat/evidence-reports ===" -ForegroundColor Cyan

try {
    $body = '{"name":"evidence-deploy"}'
    
    $hook = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v1/integrations/deploy/everreach-dashboard/feat/evidence-reports" `
        -Headers $headers `
        -Method Post `
        -Body $body
    
    Write-Host "`nDeploy Hook URL: $($hook.url)" -ForegroundColor Green
    
    Write-Host "`nTriggering deployment..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri $hook.url -Method Post | Out-Null
    
    Write-Host "`n✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`nView deployment at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/isaiahduprees-projects/everreach-dashboard/deployments`n" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
