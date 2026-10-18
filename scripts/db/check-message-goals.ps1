$token = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    apikey = $token
    Authorization = "Bearer $token"
}

Write-Host "`n=== MESSAGE GOALS ===" -ForegroundColor Cyan

try {
    $goals = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/message_goals?select=id,name,is_active&limit=10" -Headers $headers
    Write-Host "Total goals: $($goals.Count)`n"
    
    foreach ($goal in $goals) {
        $active = if ($goal.is_active) { "[ACTIVE]" } else { "[INACTIVE]" }
        Write-Host "  $active $($goal.name)"
    }
} catch {
    Write-Host "Error fetching goals" -ForegroundColor Red
}
