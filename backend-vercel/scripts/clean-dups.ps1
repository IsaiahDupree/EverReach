Write-Host "Removing duplicate migrations..." -ForegroundColor Yellow

$dups = @(
    "supabase\migrations\20251026142339_personal_profile_api.sql",
    "supabase\migrations\20251026142558_personal_profile_api.sql",
    "supabase\migrations\20251026142625_personal_profile_api.sql",
    "supabase\migrations\20251026142734_personal_profile_api.sql",
    "supabase\migrations\20251026142819_personal_profile_api.sql",
    "supabase\migrations\20251026142902_personal_profile_api.sql",
    "supabase\migrations\20251026143030_personal_profile_api.sql",
    "supabase\migrations\20251026143220_personal_profile_api.sql",
    "supabase\migrations\20251026143307_personal_profile_api.sql"
)

foreach ($file in $dups) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removed: $file" -ForegroundColor Gray
    }
}

Write-Host "✓ Done" -ForegroundColor Green
