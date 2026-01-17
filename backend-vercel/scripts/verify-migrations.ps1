# Verify Migrations on Supabase Cloud
# Checks that all migrations developed today were applied successfully

param(
    [string]$Password = "zVTEbBqIF4f8Himv"
)

$CONN = "postgresql://postgres:$Password@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Migration Verification - Nov 7, 2025" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$verificationsPassed = 0
$verificationsFailed = 0

function Test-Migration {
    param(
        [string]$Name,
        [string]$Query,
        [int]$ExpectedCount = 1
    )
    
    Write-Host "Verifying: $Name... " -NoNewline
    
    try {
        $result = psql $CONN -t -c $Query 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $count = ($result | Measure-Object -Line).Lines
            
            if ($count -ge $ExpectedCount) {
                Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
                Write-Host " ($count found)"
                $script:verificationsPassed++
                return $true
            } else {
                Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
                Write-Host " (Expected: $ExpectedCount, Found: $count)"
                $script:verificationsFailed++
                return $false
            }
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Query error)"
            Write-Host "Error: $result" -ForegroundColor Yellow
            $script:verificationsFailed++
            return $false
        }
    } catch {
        Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (Exception: $($_.Exception.Message))"
        $script:verificationsFailed++
        return $false
    }
}

# ============================================================================
# MIGRATION 1: subscription_cancellation_system.sql
# ============================================================================
Write-Host "`n=== Migration 1: Subscription Cancellation System ===" -ForegroundColor Cyan

# Check new columns in user_subscriptions
Test-Migration -Name "provider_subscription_id column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'provider_subscription_id';"

Test-Migration -Name "status column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'status';"

Test-Migration -Name "entitlement_active_until column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'entitlement_active_until';"

Test-Migration -Name "is_primary column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'is_primary';"

Test-Migration -Name "canceled_at column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'canceled_at';"

Test-Migration -Name "origin_platform_user_key column" `
    -Query "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'origin_platform_user_key';"

# Check new tables
Test-Migration -Name "unclaimed_entitlements table" `
    -Query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'unclaimed_entitlements';"

Test-Migration -Name "subscription_audit_events table" `
    -Query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_audit_events';"

# Check helper functions
Test-Migration -Name "compute_entitlement_active_until function" `
    -Query "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'compute_entitlement_active_until';"

Test-Migration -Name "resolve_user_entitlement function" `
    -Query "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'resolve_user_entitlement';"

Test-Migration -Name "log_subscription_audit function" `
    -Query "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'log_subscription_audit';"

# Check triggers
Test-Migration -Name "trigger_compute_entitlement trigger" `
    -Query "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_compute_entitlement_active_until';"

Test-Migration -Name "trigger_auto_set_primary trigger" `
    -Query "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_auto_set_primary';"

# Check indexes
Test-Migration -Name "idx_user_subscriptions_provider index" `
    -Query "SELECT indexname FROM pg_indexes WHERE tablename = 'user_subscriptions' AND indexname = 'idx_user_subscriptions_provider';"

Test-Migration -Name "idx_user_subscriptions_entitlement index" `
    -Query "SELECT indexname FROM pg_indexes WHERE tablename = 'user_subscriptions' AND indexname = 'idx_user_subscriptions_entitlement';"

# ============================================================================
# MIGRATION 2: Previous migrations (sanity check)
# ============================================================================
Write-Host "`n=== Sanity Check: Previous Migrations ===" -ForegroundColor Cyan

Test-Migration -Name "user_subscriptions table exists" `
    -Query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions';"

Test-Migration -Name "profiles table exists" `
    -Query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles';"

Test-Migration -Name "contacts table exists" `
    -Query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts';"

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $verificationsPassed" -ForegroundColor Green
Write-Host "Failed:  $verificationsFailed" -ForegroundColor $(if ($verificationsFailed -gt 0) { "Red" } else { "White" })
Write-Host ""

if ($verificationsFailed -eq 0) {
    Write-Host "✓ All migrations verified successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Migration Status:" -ForegroundColor Cyan
    Write-Host "  ✓ subscription_cancellation_system.sql - APPLIED" -ForegroundColor Green
    Write-Host "  ✓ Database schema up-to-date" -ForegroundColor Green
    Write-Host "  ✓ Helper functions created" -ForegroundColor Green
    Write-Host "  ✓ Triggers configured" -ForegroundColor Green
    Write-Host "  ✓ Indexes created" -ForegroundColor Green
} else {
    Write-Host "✗ Some verifications failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if migration was fully applied"
    Write-Host "  2. Review psql error messages above"
    Write-Host "  3. Verify database connection"
    Write-Host "  4. Re-run migration if needed"
}

Write-Host "`n==========================================" -ForegroundColor Cyan

# Show user_subscriptions structure
Write-Host "`nCurrent user_subscriptions schema:" -ForegroundColor Cyan
psql $CONN -c "\d user_subscriptions" 2>&1

Write-Host "`n==========================================" -ForegroundColor Cyan

# Exit with appropriate code
exit $(if ($verificationsFailed -gt 0) { 1 } else { 0 })
