$token = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    apikey = $token
    Authorization = "Bearer $token"
}

Write-Host "`n=== REMAINING CONTACTS ===" -ForegroundColor Cyan

$response = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts?select=display_name,emails&order=created_at.desc&limit=15" -Headers $headers

Write-Host "`nTotal fetched: $($response.Count)" -ForegroundColor Yellow
Write-Host ""

foreach ($contact in $response) {
    $emailList = $contact.emails -join ", "
    Write-Host "  - $($contact.display_name)" -NoNewline
    if ($emailList) {
        Write-Host " ($emailList)" -ForegroundColor Gray
    } else {
        Write-Host "" 
    }
}

Write-Host ""
