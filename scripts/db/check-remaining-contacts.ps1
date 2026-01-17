$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"

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
