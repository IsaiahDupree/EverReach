# Check contacts table schema via Supabase REST API
$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY'

Write-Host "Fetching contact to see available fields..." -ForegroundColor Cyan

$headers = @{
    'apikey' = $token
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri 'https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts?select=*&limit=1' -Headers $headers
    
    if ($response.Count -gt 0) {
        Write-Host "`n✅ Contact found! Available fields:" -ForegroundColor Green
        $response[0] | Get-Member -MemberType NoteProperty | ForEach-Object {
            $fieldName = $_.Name
            $fieldValue = $response[0].$fieldName
            Write-Host "  - $fieldName" -NoNewline
            if ($fieldValue) {
                Write-Host " (has data)" -ForegroundColor Gray
            } else {
                Write-Host " (null/empty)" -ForegroundColor DarkGray
            }
        }
        
        Write-Host "`n📋 Checking for pipeline-related fields:" -ForegroundColor Yellow
        $pipelineFields = @('pipeline', 'theme', 'stage', 'status')
        foreach ($field in $pipelineFields) {
            if ($response[0].PSObject.Properties.Name -contains $field) {
                Write-Host "  ✅ $field exists" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $field does NOT exist" -ForegroundColor Red
            }
        }
        
        Write-Host "`n📄 Full contact JSON:" -ForegroundColor Cyan
        $response[0] | ConvertTo-Json -Depth 5
    } else {
        Write-Host "❌ No contacts found in database" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
