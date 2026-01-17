$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Updating Evidence Supabase Connection ===" -ForegroundColor Cyan

try {
    # Get existing env vars
    $envs = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projectId/env?decrypt=true" -Headers $headers -Method Get
    $map = @{}
    foreach ($e in $envs.envs) { $map[$e.key] = $e }

    # Define connection settings for Supabase direct connection
    $updates = @(
        @{ key = "EVIDENCE_SOURCE__supabase__host"; value = "db.utasetfxiqcrnwyfforx.supabase.co" },
        @{ key = "EVIDENCE_SOURCE__supabase__port"; value = "5432" },
        @{ key = "EVIDENCE_SOURCE__supabase__database"; value = "postgres" },
        @{ key = "EVIDENCE_SOURCE__supabase__user"; value = "postgres" },
        @{ key = "EVIDENCE_SOURCE__supabase__password"; value = "Frogger12" }
    )

    foreach ($u in $updates) {
        if ($map.ContainsKey($u.key)) {
            $envItem = $map[$u.key]
            $body = @{ value = $u.value; target = $envItem.target } | ConvertTo-Json
            Write-Host ("Updating {0}" -f $u.key) -ForegroundColor Yellow
            Invoke-RestMethod -Uri ("https://api.vercel.com/v9/projects/{0}/env/{1}" -f $projectId, $envItem.id) -Headers $headers -Method Patch -Body $body | Out-Null
            Write-Host "  Updated" -ForegroundColor Green
        } else {
            Write-Host ("Creating {0}" -f $u.key) -ForegroundColor Yellow
            $body = @{ key = $u.key; value = $u.value; type = "encrypted"; target = @("production","preview","development") } | ConvertTo-Json
            Invoke-RestMethod -Uri ("https://api.vercel.com/v10/projects/{0}/env" -f $projectId) -Headers $headers -Method Post -Body $body | Out-Null
            Write-Host "  Created" -ForegroundColor Green
        }
    }

    Write-Host "`n=== Done updating credentials ===" -ForegroundColor Cyan
} catch {
    Write-Host ("Error: {0}" -f $_.Exception.Message) -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
