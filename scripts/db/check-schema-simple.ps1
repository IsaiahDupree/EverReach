$token = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    apikey = $token
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts?select=*&limit=1" -Headers $headers

Write-Host "Available fields in contacts table:"
$response[0].PSObject.Properties.Name | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nChecking for pipeline, theme, stage, status:"
"pipeline","theme","stage","status" | ForEach-Object {
    if ($response[0].PSObject.Properties.Name -contains $_) {
        Write-Host "  ✓ $_ EXISTS" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $_ NOT FOUND" -ForegroundColor Red
    }
}

Write-Host "`nFull contact data:"
$response[0] | ConvertTo-Json
