$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_QmaX0Q41OWo4konrSFNWoSoNCRHp"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Triggering Backend Deployment ===" -ForegroundColor Cyan
Write-Host "Branch: feat/dev-dashboard" -ForegroundColor Yellow
Write-Host "Project: backend-vercel" -ForegroundColor Yellow

try {
    # Create a new deployment by triggering a redeploy of latest commit
    $body = @{
        "name" = "backend-vercel"
        "gitSource" = @{
            "type" = "github"
            "ref" = "feat/dev-dashboard"
            "repoId" = 886925667
        }
    } | ConvertTo-Json -Depth 10

    Write-Host "`nTriggering deployment via Vercel API..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Headers $headers `
        -Method Post `
        -Body $body

    Write-Host "`n✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`nDeployment Details:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  URL: https://$($response.url)" -ForegroundColor White
    Write-Host "  State: $($response.readyState)" -ForegroundColor Yellow
    Write-Host "`nMonitor at: https://vercel.com/isaiahduprees-projects/backend-vercel/deployments" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error Code: $($errorObj.error.code)" -ForegroundColor Red
        Write-Host "Error Message: $($errorObj.error.message)" -ForegroundColor Red
    }
}
