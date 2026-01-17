param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [Parameter(Mandatory = $true)][string]$Key,
  [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL"
)

$headers = @{ "Authorization" = "Bearer $Token" }

Write-Host "`n=== Deleting Vercel env: $Key ==="

try {
  $envs = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId/env?decrypt=true" -Headers $headers -Method Get
  $match = $envs.envs | Where-Object { $_.key -eq $Key }
  if (-not $match) {
    Write-Host "Not found (nothing to delete)" -ForegroundColor Yellow
    return
  }
  $id = $match.id
  Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId/env/$id" -Headers $headers -Method Delete | Out-Null
  Write-Host "Deleted $Key"
} catch {
  Write-Host ("Error: {0}" -f $_.Exception.Message)
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
