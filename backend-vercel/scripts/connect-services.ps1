#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Connect Services to Developer Dashboard

.DESCRIPTION
    Interactive script to connect Stripe, PostHog, Resend, and other services

.EXAMPLE
    .\scripts\connect-services.ps1
#>

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host "${Blue}═══════════════════════════════════════════════════════${Reset}"
Write-Host "${Blue}  Connect Services to Dashboard${Reset}"
Write-Host "${Blue}═══════════════════════════════════════════════════════${Reset}`n"

# Configuration
$BASE = "https://ever-reach-be.vercel.app"

# Get Supabase token
Write-Host "${Cyan}Step 1: Get your Supabase auth token${Reset}"
Write-Host "Run this in your browser console (on your app):"
Write-Host "${Yellow}localStorage.getItem('supabase.auth.token')${Reset}`n"

$TOKEN = Read-Host "Enter your token"

if ([string]::IsNullOrWhiteSpace($TOKEN)) {
    Write-Host "${Red}Error: Token is required${Reset}"
    exit 1
}

Write-Host "`n${Green}✓ Token set${Reset}`n"

# Test connection
Write-Host "${Cyan}Testing connection...${Reset}"
try {
    $response = Invoke-RestMethod -Uri "$BASE/api/integrations/health" `
        -Headers @{ Authorization = "Bearer $TOKEN" } `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "${Green}✓ Connection successful!${Reset}"
    Write-Host "${Cyan}Current workspace: $($response.workspace_id)${Reset}`n"
} catch {
    Write-Host "${Red}✗ Connection failed: $($_.Exception.Message)${Reset}"
    Write-Host "${Yellow}Make sure your token is valid and not expired${Reset}`n"
    exit 1
}

# Menu
function Show-Menu {
    Write-Host "${Blue}═══════════════════════════════════════════════════════${Reset}"
    Write-Host "${Cyan}  Available Services${Reset}"
    Write-Host "${Blue}═══════════════════════════════════════════════════════${Reset}"
    Write-Host "1. Stripe (Payments & Subscriptions)"
    Write-Host "2. PostHog (Analytics)"
    Write-Host "3. Resend (Email)"
    Write-Host "4. RevenueCat (Mobile Subscriptions)"
    Write-Host "5. Supabase (Database & Auth)"
    Write-Host "6. Backend (Self-monitoring)"
    Write-Host "7. View Connected Services"
    Write-Host "8. Exit"
    Write-Host "${Blue}═══════════════════════════════════════════════════════${Reset}`n"
}

function Connect-Service {
    param(
        [string]$Service,
        [hashtable]$Credentials,
        [string[]]$Scopes = @('read')
    )
    
    try {
        $body = @{
            service = $Service
            credentials = $Credentials
            scopes = $Scopes
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$BASE/api/integrations" `
            -Headers @{
                Authorization = "Bearer $TOKEN"
                "Content-Type" = "application/json"
            } `
            -Method Post `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "${Green}✓ $Service connected successfully!${Reset}`n"
        return $true
    } catch {
        Write-Host "${Red}✗ Failed to connect $Service${Reset}"
        Write-Host "${Yellow}Error: $($_.Exception.Message)${Reset}`n"
        return $false
    }
}

function Show-ConnectedServices {
    Write-Host "${Cyan}Fetching connected services...${Reset}`n"
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE/api/integrations" `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -Method Get
        
        if ($response.integrations.Count -eq 0) {
            Write-Host "${Yellow}No services connected yet${Reset}`n"
        } else {
            Write-Host "${Green}Connected Services:${Reset}"
            foreach ($integration in $response.integrations) {
                $status = if ($integration.is_active) { "${Green}Active${Reset}" } else { "${Red}Inactive${Reset}" }
                Write-Host "  • $($integration.service) - $status"
            }
            Write-Host ""
        }
    } catch {
        Write-Host "${Red}✗ Failed to fetch services${Reset}"
        Write-Host "${Yellow}Error: $($_.Exception.Message)${Reset}`n"
    }
}

# Main loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Select an option (1-8)"
    
    switch ($choice) {
        "1" {
            Write-Host "`n${Cyan}Connecting Stripe...${Reset}"
            Write-Host "Get your API key from: ${Yellow}https://dashboard.stripe.com/apikeys${Reset}"
            Write-Host "Use a ${Yellow}Secret key${Reset} starting with sk_live_ or sk_test_`n"
            
            $apiKey = Read-Host "Enter your Stripe API key"
            
            if (-not [string]::IsNullOrWhiteSpace($apiKey)) {
                $credentials = @{ api_key = $apiKey }
                Connect-Service -Service "stripe" -Credentials $credentials
            } else {
                Write-Host "${Red}✗ API key is required${Reset}`n"
            }
        }
        
        "2" {
            Write-Host "`n${Cyan}Connecting PostHog...${Reset}"
            Write-Host "Get your credentials from: ${Yellow}https://app.posthog.com/project/settings${Reset}"
            Write-Host "You need: API key (Personal API key) and Project ID`n"
            
            $apiKey = Read-Host "Enter your PostHog API key"
            $projectId = Read-Host "Enter your Project ID"
            
            if (-not [string]::IsNullOrWhiteSpace($apiKey) -and -not [string]::IsNullOrWhiteSpace($projectId)) {
                $credentials = @{
                    api_key = $apiKey
                    project_id = $projectId
                }
                Connect-Service -Service "posthog" -Credentials $credentials
            } else {
                Write-Host "${Red}✗ Both API key and Project ID are required${Reset}`n"
            }
        }
        
        "3" {
            Write-Host "`n${Cyan}Connecting Resend...${Reset}"
            Write-Host "Get your API key from: ${Yellow}https://resend.com/api-keys${Reset}"
            Write-Host "Use an API key starting with re_`n"
            
            $apiKey = Read-Host "Enter your Resend API key"
            
            if (-not [string]::IsNullOrWhiteSpace($apiKey)) {
                $credentials = @{ api_key = $apiKey }
                Connect-Service -Service "resend" -Credentials $credentials
            } else {
                Write-Host "${Red}✗ API key is required${Reset}`n"
            }
        }
        
        "4" {
            Write-Host "`n${Cyan}Connecting RevenueCat...${Reset}"
            Write-Host "Get your API key from: ${Yellow}https://app.revenuecat.com/settings/api-keys${Reset}"
            Write-Host "Use a ${Yellow}Public API key${Reset}`n"
            
            $apiKey = Read-Host "Enter your RevenueCat API key"
            
            if (-not [string]::IsNullOrWhiteSpace($apiKey)) {
                $credentials = @{ api_key = $apiKey }
                Connect-Service -Service "revenuecat" -Credentials $credentials
            } else {
                Write-Host "${Red}✗ API key is required${Reset}`n"
            }
        }
        
        "5" {
            Write-Host "`n${Cyan}Connecting Supabase...${Reset}"
            Write-Host "Get your credentials from: ${Yellow}https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/settings/api${Reset}"
            Write-Host "You need: Project URL and Service Role Key (secret)${Reset}`n"
            
            $projectUrl = Read-Host "Enter your Project URL"
            $serviceRoleKey = Read-Host "Enter your Service Role Key"
            
            if (-not [string]::IsNullOrWhiteSpace($projectUrl) -and -not [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
                $credentials = @{
                    project_url = $projectUrl
                    service_role_key = $serviceRoleKey
                }
                Connect-Service -Service "supabase" -Credentials $credentials
            } else {
                Write-Host "${Red}✗ Both Project URL and Service Role Key are required${Reset}`n"
            }
        }
        
        "6" {
            Write-Host "`n${Cyan}Connecting Backend (Self-monitoring)...${Reset}"
            
            $credentials = @{ base_url = $BASE }
            Connect-Service -Service "backend" -Credentials $credentials
        }
        
        "7" {
            Show-ConnectedServices
            Read-Host "Press Enter to continue"
        }
        
        "8" {
            Write-Host "`n${Green}Goodbye!${Reset}`n"
            exit 0
        }
        
        default {
            Write-Host "${Red}Invalid option. Please select 1-8${Reset}`n"
        }
    }
}
