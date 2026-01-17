$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_QmaX0Q41OWo4konrSFNWoSoNCRHp"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Triggering Backend Deployment ===" -ForegroundColor Cyan

try {
    # Trigger deployment via hook
    $body = @{} | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Headers $headers `
        -Method Post `
        -Body (@{
            "name" = "backend-vercel"
            "project" = $projectId
            "target" = "production"
            "gitSource" = @{
                "type" = "github"
                "ref" = "feat/dev-dashboard"
                "repoId" = "IsaiahDupree/rork-ai-enhanced-personal-crm"
            }
        } | ConvertTo-Json)

    Write-Host "`n✅ Deployment triggered!" -ForegroundColor Green
    Write-Host "Deployment URL: $($response.url)" -ForegroundColor White
    Write-Host "Monitor at: https://vercel.com/isaiahduprees-projects/backend-vercel/deployments" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
