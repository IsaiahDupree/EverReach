$deployHook = "https://api.vercel.com/v1/integrations/deploy/prj_QmaX0Q41OWo4konrSFNWoSoNCRHp/uWCmQmcLsf"

Write-Host "`n=== Triggering Backend Deployment via Deploy Hook ===" -ForegroundColor Cyan
Write-Host "Deploy Hook: $deployHook" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $deployHook -Method Post
    
    Write-Host "`n✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`nDeployment Details:" -ForegroundColor Cyan
    Write-Host "  Job State: $($response.job.state)" -ForegroundColor White
    Write-Host "  Job Created: $($response.job.createdAt)" -ForegroundColor Gray
    Write-Host "`nMonitor deployment at:" -ForegroundColor Cyan
    Write-Host "  https://vercel.com/isaiahduprees-projects/backend-vercel/deployments" -ForegroundColor White

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
