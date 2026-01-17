param(
    [string]$ProjectName = "everreach-dashboard",
    [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL",
    [string]$Branch = "feat/evidence-reports"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Updating Vercel Project Git Settings ===" -ForegroundColor Cyan

try {
    # Get current project settings
    Write-Host "`nFetching current project configuration..." -ForegroundColor Yellow
    $project = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v9/projects/$ProjectName" `
        -Headers $headers `
        -Method Get
    
    Write-Host "Current Git Branch: $($project.link.productionBranch)" -ForegroundColor Yellow
    
    # Update production branch
    Write-Host "`nUpdating production branch to: $Branch" -ForegroundColor Yellow
    
    $body = @{
        link = @{
            type = $project.link.type
            repo = $project.link.repo
            repoId = $project.link.repoId
            gitCredentialId = $project.link.gitCredentialId
            productionBranch = $Branch
        }
    } | ConvertTo-Json -Depth 10
    
    $updated = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v9/projects/$ProjectName" `
        -Headers $headers `
        -Method Patch `
        -Body $body
    
    Write-Host "`n✅ Successfully updated production branch to: $Branch" -ForegroundColor Green
    
    Write-Host "`nTriggering new deployment..." -ForegroundColor Yellow
    
    # Create a deployment hook and trigger it
    $hookBody = @{
        name = "manual-deploy"
    } | ConvertTo-Json
    
    $hook = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v1/integrations/deploy/$ProjectName/create" `
        -Headers $headers `
        -Method Post `
        -Body $hookBody
    
    # Trigger the hook
    Invoke-RestMethod -Uri $hook.url -Method Post | Out-Null
    
    Write-Host "✅ Deployment triggered!" -ForegroundColor Green
    Write-Host "`nCheck deployment status at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/isaiahduprees-projects/everreach-dashboard/deployments" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
