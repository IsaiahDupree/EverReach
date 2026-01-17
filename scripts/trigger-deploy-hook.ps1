$deployHookUrl = "https://api.vercel.com/v1/integrations/deploy/prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt/iHjkuE0ssb"

Write-Host "`n=== Triggering Vercel Deployment ===" -ForegroundColor Cyan
Write-Host "Deploy Hook: $deployHookUrl`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $deployHookUrl -Method Post
    
    Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`nDeployment Details:" -ForegroundColor Cyan
    Write-Host "Job State: $($response.job.state)" -ForegroundColor Yellow
    Write-Host "Job Created: $($response.job.createdAt)" -ForegroundColor Yellow
    
    Write-Host "`nMonitor deployment at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/isaiahduprees-projects/everreach-dashboard/deployments`n" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error triggering deployment: $($_.Exception.Message)" -ForegroundColor Red
}
