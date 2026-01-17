param(
  [string]$ProjectId = "prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt",
  [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL"
)

$headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }

Write-Host "`n=== Updating Evidence datasource env vars (host/port) ===" -ForegroundColor Cyan

try {
  $envs = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId/env?decrypt=true" -Headers $headers -Method Get
  $map = @{}
  foreach ($e in $envs.envs) { $map[$e.key] = $e }

  # Build connection string (password is URL-encoded)
  $encodedPwd = 'everreach123%21%40%23'
  $connectionString = "postgresql://postgres.utasetfxiqcrnwyfforx:$encodedPwd@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

  $updates = @(
    @{ key = "EVIDENCE_SOURCE__supabase__host"; value = "aws-0-us-west-1.pooler.supabase.com" },
    @{ key = "EVIDENCE_SOURCE__supabase__port"; value = "6543" },
    @{ key = "EVIDENCE_SOURCE__supabase__ssl"; value = "true" },
    @{ key = "EVIDENCE_SOURCE__supabase__ssl__rejectUnauthorized"; value = "false" },
    @{ key = "NODE_TLS_REJECT_UNAUTHORIZED"; value = "0" },
    @{ key = "EVIDENCE_SOURCE__supabase__connectionString"; value = $connectionString }
  )

  foreach ($u in $updates) {
    if ($map.ContainsKey($u.key)) {
      $envItem = $map[$u.key]
      $body = @{ value = $u.value; target = $envItem.target } | ConvertTo-Json
      Write-Host ("Updating {0} -> {1}" -f $u.key, $u.value) -ForegroundColor Yellow
      $res = Invoke-RestMethod -Uri ("https://api.vercel.com/v9/projects/{0}/env/{1}" -f $ProjectId, $envItem.id) -Headers $headers -Method Patch -Body $body
      Write-Host "  ✔ Updated" -ForegroundColor Green
    } else {
      Write-Host ("Creating {0} -> {1}" -f $u.key, $u.value) -ForegroundColor Yellow
      $body = @{ key = $u.key; value = $u.value; type = "encrypted"; target = @("production","preview","development") } | ConvertTo-Json
      $res = Invoke-RestMethod -Uri ("https://api.vercel.com/v10/projects/{0}/env" -f $ProjectId) -Headers $headers -Method Post -Body $body
      Write-Host "  ✔ Created" -ForegroundColor Green
    }
  }

  Write-Host "`n=== Done updating envs ===" -ForegroundColor Cyan
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
