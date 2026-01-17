#!/usr/bin/env pwsh
#
# Expo Test Suite Orchestrator
# Starts Expo Web, Mobile (Android/iOS), and runs tests in separate terminals
#
# Usage:
#   .\start-expo-suite.ps1                    # Start Web + Android + Tests
#   .\start-expo-suite.ps1 -WebOnly          # Start only Web
#   .\start-expo-suite.ps1 -AndroidOnly      # Start only Android
#   .\start-expo-suite.ps1 -SkipTests        # Skip test execution
#   .\start-expo-suite.ps1 -SkipKill         # Don't kill existing processes
#

param(
    [switch]$WebOnly,
    [switch]$AndroidOnly,
    [switch]$IOSOnly,
    [switch]$SkipTests,
    [switch]$SkipKill,
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host @"

Expo Test Suite Orchestrator
=============================

Starts Expo Web, Mobile, and tests in separate terminal windows.

USAGE:
    .\start-expo-suite.ps1 [OPTIONS]

OPTIONS:
    -WebOnly       Start only Expo Web (port 19006)
    -AndroidOnly   Start only Android/Metro (port 8081)
    -IOSOnly       Start only iOS/Metro (port 8081)
    -SkipTests     Skip running tests
    -SkipKill      Don't kill existing Expo processes
    -Help          Show this help message

EXAMPLES:
    # Start everything (default)
    .\start-expo-suite.ps1

    # Web only
    .\start-expo-suite.ps1 -WebOnly

    # Android + Web without tests
    .\start-expo-suite.ps1 -SkipTests

    # iOS only
    .\start-expo-suite.ps1 -IOSOnly

TERMINALS OPENED:
    1. Expo Web (cyan) - http://localhost:19006
    2. Expo Mobile (green) - Metro bundler on port 8081
    3. Tests (magenta) - Jest/Playwright tests

"@
    exit 0
}

# Colors
$COLOR_HEADER = "Cyan"
$COLOR_SUCCESS = "Green"
$COLOR_INFO = "Gray"
$COLOR_WARN = "Yellow"
$COLOR_ERROR = "Red"

# Banner
Write-Host ""
Write-Host "============================================================" -ForegroundColor $COLOR_HEADER
Write-Host "  EXPO TEST SUITE ORCHESTRATOR" -ForegroundColor $COLOR_HEADER
Write-Host "============================================================" -ForegroundColor $COLOR_HEADER
Write-Host ""

# Get project directory (current directory)
$EXPO_PROJECT_PATH = Get-Location
Write-Host "   [INFO] Expo project: $EXPO_PROJECT_PATH" -ForegroundColor $COLOR_INFO

# Check if valid Expo project
if (-not (Test-Path "$EXPO_PROJECT_PATH\package.json")) {
    Write-Host "   [ERROR] No package.json found in current directory" -ForegroundColor $COLOR_ERROR
    Write-Host "   [ERROR] Please run from your Expo project root" -ForegroundColor $COLOR_ERROR
    exit 1
}

# Check for node
try {
    $null = node --version
} catch {
    Write-Host "   [ERROR] Node.js not found. Please install Node.js" -ForegroundColor $COLOR_ERROR
    exit 1
}

# Helper: Kill process on port
function Kill-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = netstat -ano | Select-String ":$Port"
        if ($connections) {
            foreach ($line in $connections) {
                if ($line -match '\s+(\d+)\s*$') {
                    $pid = $matches[1]
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "   [OK] Killed process $pid on port $Port" -ForegroundColor $COLOR_SUCCESS
                    } catch {
                        Write-Host "   [WARN] Could not kill PID $pid" -ForegroundColor $COLOR_WARN
                    }
                }
            }
        } else {
            Write-Host "   [INFO] No process on port $Port" -ForegroundColor $COLOR_INFO
        }
    } catch {
        Write-Host "   [WARN] Could not check port $Port" -ForegroundColor $COLOR_WARN
    }
}

# Helper: Check if port is in use
function Test-PortInUse {
    param([int]$Port)
    
    $connections = netstat -ano | Select-String ":$Port"
    return $null -ne $connections
}

# Helper: Wait for URL to respond
function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30,
        [int]$RetryDelaySeconds = 2
    )
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # URL not ready yet
        }
        
        Start-Sleep -Seconds $RetryDelaySeconds
        $elapsed += $RetryDelaySeconds
    }
    
    return $false
}

# =============================================================================
# STEP 1: Kill existing Expo processes
# =============================================================================

if (-not $SkipKill) {
    Write-Host "STEP 1: Killing existing Expo processes..." -ForegroundColor $COLOR_HEADER
    
    # Kill Metro bundler (port 8081)
    Kill-ProcessOnPort -Port 8081
    
    # Kill Expo Web (port 19006)
    Kill-ProcessOnPort -Port 19006
    
    # Kill any node processes with "expo" in command line
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        if ($cmdLine -like "*expo*") {
            try {
                Stop-Process -Id $_.Id -Force
                Write-Host "   [OK] Killed Expo process $($_.Id)" -ForegroundColor $COLOR_SUCCESS
            } catch {
                Write-Host "   [WARN] Could not kill process $($_.Id)" -ForegroundColor $COLOR_WARN
            }
        }
    }
    
    Write-Host ""
}

# =============================================================================
# STEP 2: Start Expo Web (if not AndroidOnly/IOSOnly)
# =============================================================================

if (-not $AndroidOnly -and -not $IOSOnly) {
    Write-Host "STEP 2: Starting Expo Web (port 19006)..." -ForegroundColor $COLOR_HEADER
    
    # Create start script for Expo Web
    $webScript = @"
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '  EXPO WEB (Port 19006)' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Starting Expo Web...' -ForegroundColor Green
Write-Host ''

Set-Location '$EXPO_PROJECT_PATH'
npm run start-web

Write-Host ''
Write-Host 'Expo Web stopped.' -ForegroundColor Yellow
Read-Host 'Press Enter to close'
"@
    
    $webScriptPath = Join-Path $env:TEMP "expo-web-start.ps1"
    $webScript | Out-File -FilePath $webScriptPath -Encoding UTF8
    
    # Start in new terminal
    Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $webScriptPath
    
    Write-Host "   [OK] Expo Web terminal launched" -ForegroundColor $COLOR_SUCCESS
    Write-Host "   Waiting 12 seconds for Expo Web to start..." -ForegroundColor $COLOR_INFO
    Start-Sleep -Seconds 12
    
    # Check if Web is running
    if (Test-PortInUse -Port 19006) {
        Write-Host "   [OK] Expo Web is running on http://localhost:19006" -ForegroundColor $COLOR_SUCCESS
    } else {
        Write-Host "   [WARN] Expo Web may not have started yet" -ForegroundColor $COLOR_WARN
        Write-Host "   [INFO] Check the Expo Web terminal for errors" -ForegroundColor $COLOR_INFO
    }
    
    Write-Host ""
}

# =============================================================================
# STEP 3: Start Expo Android/iOS (if not WebOnly)
# =============================================================================

if (-not $WebOnly) {
    $mobileType = "Android"
    $startCommand = "npm run android"
    
    if ($IOSOnly) {
        $mobileType = "iOS"
        $startCommand = "npm run ios"
    }
    
    Write-Host "STEP 3: Starting Expo $mobileType..." -ForegroundColor $COLOR_HEADER
    
    # Create start script for Expo Mobile
    $mobileScript = @"
Write-Host '============================================' -ForegroundColor Green
Write-Host '  EXPO $mobileType' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Starting Expo with $mobileType options...' -ForegroundColor Green
Write-Host ''
Write-Host 'Choose option in Expo Dev Tools:' -ForegroundColor Cyan
Write-Host '  a - Run on Android device/emulator' -ForegroundColor Gray
Write-Host '  i - Run on iOS simulator (if on Mac)' -ForegroundColor Gray
Write-Host '  w - Run on web browser' -ForegroundColor Gray
Write-Host '  r - Reload app' -ForegroundColor Gray
Write-Host '  m - Toggle menu' -ForegroundColor Gray
Write-Host ''

Set-Location '$EXPO_PROJECT_PATH'
$startCommand

Write-Host ''
Write-Host 'Expo $mobileType stopped.' -ForegroundColor Yellow
Read-Host 'Press Enter to close'
"@
    
    $mobileScriptPath = Join-Path $env:TEMP "expo-mobile-start.ps1"
    $mobileScript | Out-File -FilePath $mobileScriptPath -Encoding UTF8
    
    # Start in new terminal
    Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $mobileScriptPath
    
    Write-Host "   [OK] Expo $mobileType terminal launched" -ForegroundColor $COLOR_SUCCESS
    Write-Host "   Waiting 8 seconds for Expo to start..." -ForegroundColor $COLOR_INFO
    Start-Sleep -Seconds 8
    
    # Check if Metro is running
    if (Test-PortInUse -Port 8081) {
        Write-Host "   [OK] Metro bundler is running on http://localhost:8081" -ForegroundColor $COLOR_SUCCESS
    } else {
        Write-Host "   [WARN] Metro bundler may not have started yet" -ForegroundColor $COLOR_WARN
        Write-Host "   [INFO] Check the Expo $mobileType terminal for errors" -ForegroundColor $COLOR_INFO
    }
    
    Write-Host ""
}

# =============================================================================
# STEP 4: Run Tests (if not SkipTests)
# =============================================================================

if (-not $SkipTests) {
    Write-Host "STEP 4: Running Expo Tests..." -ForegroundColor $COLOR_HEADER
    
    # Check if test script exists
    $packageJson = Get-Content "$EXPO_PROJECT_PATH\package.json" -Raw | ConvertFrom-Json
    if (-not $packageJson.scripts.test) {
        Write-Host "   [WARN] No test script found in package.json" -ForegroundColor $COLOR_WARN
        Write-Host "   [INFO] Skipping test execution" -ForegroundColor $COLOR_INFO
    } else {
        # Create start script for tests
        $testScript = @"
Write-Host '============================================' -ForegroundColor Magenta
Write-Host '  EXPO TESTS' -ForegroundColor Magenta
Write-Host '============================================' -ForegroundColor Magenta
Write-Host ''
Write-Host 'Running Expo tests...' -ForegroundColor Green
Write-Host ''

Set-Location '$EXPO_PROJECT_PATH'
npm test

Write-Host ''
Write-Host 'Tests completed.' -ForegroundColor Yellow
Read-Host 'Press Enter to close'
"@
        
        $testScriptPath = Join-Path $env:TEMP "expo-tests-start.ps1"
        $testScript | Out-File -FilePath $testScriptPath -Encoding UTF8
        
        # Start in new terminal
        Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $testScriptPath
        
        Write-Host "   [OK] Test terminal launched" -ForegroundColor $COLOR_SUCCESS
    }
    
    Write-Host ""
}

# =============================================================================
# Summary
# =============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor $COLOR_HEADER
Write-Host "  ALL PROCESSES STARTED" -ForegroundColor $COLOR_HEADER
Write-Host "============================================================" -ForegroundColor $COLOR_HEADER
Write-Host ""
Write-Host "Summary:" -ForegroundColor $COLOR_INFO

if (-not $AndroidOnly -and -not $IOSOnly) {
    Write-Host "   Expo Web:    http://localhost:19006" -ForegroundColor $COLOR_SUCCESS
}

if (-not $WebOnly) {
    Write-Host "   Metro:       http://localhost:8081" -ForegroundColor $COLOR_SUCCESS
    
    if ($IOSOnly) {
        Write-Host "   iOS:         Press 'i' in Expo terminal" -ForegroundColor $COLOR_INFO
    } else {
        Write-Host "   Android:     Press 'a' in Expo terminal" -ForegroundColor $COLOR_INFO
    }
}

if (-not $SkipTests) {
    Write-Host "   Tests:       Running in separate terminal" -ForegroundColor $COLOR_INFO
}

Write-Host ""
Write-Host "Tip: Check each terminal window for output!" -ForegroundColor Cyan
Write-Host ""
