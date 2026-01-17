$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_QmaX0Q41OWo4konrSFNWoSoNCRHp"

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n=== Checking Backend Deployments ===" -ForegroundColor Cyan

try {
    $deployments = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$projectId&limit=5" `
        -Headers $headers `
        -Method Get

    Write-Host "`nRecent Deployments:`n" -ForegroundColor Yellow
    
    foreach ($dep in $deployments.deployments) {
        $created = [DateTimeOffset]::FromUnixTimeMilliseconds($dep.created).ToLocalTime()
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Write-Host "State: $($dep.state)" -ForegroundColor $(if($dep.state -eq 'READY'){'Green'}elseif($dep.state -eq 'ERROR'){'Red'}else{'Yellow'})
        Write-Host "URL: https://$($dep.url)" -ForegroundColor White
        Write-Host "Branch: $($dep.meta.githubCommitRef)" -ForegroundColor Cyan
        Write-Host "Commit: $($dep.meta.githubCommitSha.Substring(0,7))" -ForegroundColor Gray
        Write-Host "Created: $created" -ForegroundColor Gray
    }
    
    Write-Host "`n========================================" -ForegroundColor Gray
    Write-Host "Production URL: https://ever-reach-be.vercel.app" -ForegroundColor Green
    Write-Host "Dashboard: https://vercel.com/isaiahduprees-projects/backend-vercel" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
