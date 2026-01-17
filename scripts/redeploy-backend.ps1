$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_QmaX0Q41OWo4konrSFNWoSoNCRHp"

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n=== Getting Latest Deployment ===" -ForegroundColor Cyan

try {
    # Get latest deployment
    $deployments = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$projectId&limit=1" `
        -Headers $headers `
        -Method Get

    if ($deployments.deployments.Count -gt 0) {
        $latest = $deployments.deployments[0]
        Write-Host "Latest deployment: $($latest.url)" -ForegroundColor White
        Write-Host "Status: $($latest.state)" -ForegroundColor Yellow
        
        # Redeploy
        Write-Host "`nTriggering redeploy..." -ForegroundColor Cyan
        $redeploy = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$($latest.uid)/redeploy" `
            -Headers $headers `
            -Method Post `
            -Body "{}" `
            -ContentType "application/json"
        
        Write-Host "✅ Redeployment triggered!" -ForegroundColor Green
        Write-Host "New deployment URL: $($redeploy.url)" -ForegroundColor White
    } else {
        Write-Host "No deployments found" -ForegroundColor Yellow
    }

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
