#!/bin/bash

###############################################################################
# StoreKit Purchase Reset Script
# 
# This script automates the complete reset of StoreKit test purchases and
# app state to enable clean test runs without manual intervention.
#
# Usage: bash scripts/reset-storekit-purchases.sh [options]
#
# Options:
#   --quick, -q       Quick reset (skip rebuild)
#   --force, -f       Skip confirmation prompts
#   --verbose, -v     Show detailed output
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Parse arguments
QUICK_MODE=false
FORCE_MODE=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --quick|-q) QUICK_MODE=true ;;
        --force|-f) FORCE_MODE=true ;;
        --verbose|-v) VERBOSE=true ;;
        --help|-h)
            echo "Usage: bash scripts/reset-storekit-purchases.sh [options]"
            echo ""
            echo "Options:"
            echo "  --quick, -q       Quick reset (skip rebuild)"
            echo "  --force, -f       Skip confirmation prompts"
            echo "  --verbose, -v     Show detailed output"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *)
            echo "${RED}Unknown option: $arg${NC}"
            exit 1
            ;;
    esac
done

# Header
clear
echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}║           ${BOLD}STOREKIT PURCHASE RESET SCRIPT${NC}${CYAN}                  ║${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Confirmation
if [ "$FORCE_MODE" = false ]; then
    echo "${YELLOW}This script will:${NC}"
    echo "  1. Terminate the app on simulator"
    echo "  2. Clear StoreKit purchase history"
    echo "  3. Reset RevenueCat cache (AsyncStorage)"
    echo "  4. Clear app UserDefaults"
    echo "  5. Reset Superwall cache"
    if [ "$QUICK_MODE" = false ]; then
        echo "  6. Rebuild and relaunch the app"
    fi
    echo ""
    echo "${RED}⚠️  This will delete all test purchase data!${NC}"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "${YELLOW}Aborted.${NC}"
        exit 0
    fi
fi

echo ""
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}${BOLD}Starting Reset Process${NC}"
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Terminate the app
echo "${CYAN}[1/6]${NC} Terminating app on simulator..."
APP_BUNDLE_ID="com.everreach.app"

BOOTED_DEVICE=$(xcrun simctl list devices | grep "Booted" | head -n 1 | sed 's/.*(\([^)]*\)).*/\1/')

if [ -n "$BOOTED_DEVICE" ]; then
    xcrun simctl terminate "$BOOTED_DEVICE" "$APP_BUNDLE_ID" 2>/dev/null || true
    echo "${GREEN}✓ App terminated${NC}"
else
    echo "${YELLOW}⚠ No booted simulator found${NC}"
fi

# Step 2: Clear StoreKit purchase history
echo ""
echo "${CYAN}[2/6]${NC} Clearing StoreKit purchase history..."

if [ -n "$BOOTED_DEVICE" ]; then
    # Clear StoreKit database
    STOREKIT_DB="$HOME/Library/Developer/CoreSimulator/Devices/$BOOTED_DEVICE/data/Library/Caches/com.apple.storekitd/"
    
    if [ -d "$STOREKIT_DB" ]; then
        rm -rf "$STOREKIT_DB"* 2>/dev/null || true
        echo "${GREEN}✓ StoreKit cache cleared${NC}"
    else
        echo "${YELLOW}⚠ StoreKit database not found (may already be clean)${NC}"
    fi
    
    # Also clear the StoreKit transaction database
    TRANSACTION_DB="$HOME/Library/Developer/CoreSimulator/Devices/$BOOTED_DEVICE/data/Library/com.apple.storekitd/"
    if [ -d "$TRANSACTION_DB" ]; then
        rm -rf "$TRANSACTION_DB"* 2>/dev/null || true
        echo "${GREEN}✓ StoreKit transaction database cleared${NC}"
    fi
else
    echo "${YELLOW}⚠ Skipped (no booted simulator)${NC}"
fi

# Step 3: Reset RevenueCat cache (AsyncStorage)
echo ""
echo "${CYAN}[3/6]${NC} Resetting RevenueCat cache..."

if [ -n "$BOOTED_DEVICE" ]; then
    # Clear AsyncStorage (where RevenueCat stores data)
    ASYNC_STORAGE_PATH="$HOME/Library/Developer/CoreSimulator/Devices/$BOOTED_DEVICE/data/Containers/Data/Application/"
    
    # Find the app's container
    APP_CONTAINER=$(find "$ASYNC_STORAGE_PATH" -name "Documents" -path "*/Documents" 2>/dev/null | while read doc_path; do
        container_path=$(dirname "$doc_path")
        if [ -d "$container_path/Library/Preferences" ]; then
            grep -l "$APP_BUNDLE_ID" "$container_path/Library/Preferences/"*.plist 2>/dev/null && echo "$container_path"
        fi
    done | head -n 1)
    
    if [ -n "$APP_CONTAINER" ]; then
        # Clear AsyncStorage
        ASYNC_STORAGE_FILE="$APP_CONTAINER/Documents/RCTAsyncLocalStorage_V1"
        if [ -f "$ASYNC_STORAGE_FILE" ]; then
            rm -rf "$ASYNC_STORAGE_FILE"* 2>/dev/null || true
            echo "${GREEN}✓ AsyncStorage cleared (RevenueCat cache removed)${NC}"
        else
            echo "${YELLOW}⚠ AsyncStorage not found (may be clean)${NC}"
        fi
        
        # Clear React Native AsyncStorage manifest
        MANIFEST_FILE="$APP_CONTAINER/Documents/.RCTAsyncStorageManifest"
        if [ -f "$MANIFEST_FILE" ]; then
            rm -f "$MANIFEST_FILE" 2>/dev/null || true
        fi
    else
        echo "${YELLOW}⚠ App container not found${NC}"
    fi
else
    echo "${YELLOW}⚠ Skipped (no booted simulator)${NC}"
fi

# Step 4: Clear app UserDefaults
echo ""
echo "${CYAN}[4/6]${NC} Clearing app UserDefaults..."

if [ -n "$BOOTED_DEVICE" ]; then
    if [ -n "$APP_CONTAINER" ]; then
        PREFS_PATH="$APP_CONTAINER/Library/Preferences"
        if [ -d "$PREFS_PATH" ]; then
            find "$PREFS_PATH" -name "*.plist" -delete 2>/dev/null || true
            echo "${GREEN}✓ UserDefaults cleared${NC}"
        else
            echo "${YELLOW}⚠ Preferences not found${NC}"
        fi
    fi
else
    echo "${YELLOW}⚠ Skipped (no booted simulator)${NC}"
fi

# Step 5: Reset Superwall cache
echo ""
echo "${CYAN}[5/6]${NC} Resetting Superwall cache..."

if [ -n "$BOOTED_DEVICE" ] && [ -n "$APP_CONTAINER" ]; then
    # Clear Superwall-specific cache
    CACHES_PATH="$APP_CONTAINER/Library/Caches"
    if [ -d "$CACHES_PATH" ]; then
        find "$CACHES_PATH" -name "*Superwall*" -delete 2>/dev/null || true
        find "$CACHES_PATH" -name "*paywall*" -delete 2>/dev/null || true
        echo "${GREEN}✓ Superwall cache cleared${NC}"
    else
        echo "${YELLOW}⚠ Caches directory not found${NC}"
    fi
else
    echo "${YELLOW}⚠ Skipped (no booted simulator or app container)${NC}"
fi

# Step 6: Rebuild and relaunch (optional)
echo ""
if [ "$QUICK_MODE" = true ]; then
    echo "${CYAN}[6/6]${NC} Skipping rebuild (quick mode)"
    echo "${YELLOW}⚠ You'll need to manually restart the app${NC}"
else
    echo "${CYAN}[6/6]${NC} Rebuilding and relaunching app..."
    echo "${YELLOW}This may take a few minutes...${NC}"
    echo ""
    
    # Navigate to mobileapp directory
    cd "$(dirname "$0")/.."
    
    if [ "$VERBOSE" = true ]; then
        npx expo run:ios --configuration Debug
    else
        npx expo run:ios --configuration Debug > /dev/null 2>&1 &
        REBUILD_PID=$!
        
        # Show progress spinner
        spin='-\|/'
        i=0
        while kill -0 $REBUILD_PID 2>/dev/null; do
            i=$(( (i+1) %4 ))
            printf "\r${CYAN}Building... ${spin:$i:1}${NC}"
            sleep 0.1
        done
        
        # Wait for process to complete
        wait $REBUILD_PID
        REBUILD_EXIT_CODE=$?
        
        echo ""
        
        if [ $REBUILD_EXIT_CODE -eq 0 ]; then
            echo "${GREEN}✓ App rebuilt and launched${NC}"
        else
            echo "${RED}✗ Build failed${NC}"
            echo "${YELLOW}Try running manually: npx expo run:ios${NC}"
        fi
    fi
fi

# Summary
echo ""
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}${BOLD}✅ Reset Complete!${NC}"
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Verification steps
echo "${YELLOW}Verification Steps:${NC}"
echo "  1. Open the app in simulator"
echo "  2. Sign in with test account"
echo "  3. Go to Settings → Subscription"
echo "  4. Verify status shows 'Free Trial' or 'Expired'"
echo "  5. Try making a test purchase"
echo ""

# Stats
echo "${CYAN}Next Steps:${NC}"
echo "  • Run interactive test: ${GREEN}npm run test:interactive${NC}"
echo "  • Run Maestro test: ${GREEN}npm run test:maestro:purchase${NC}"
echo "  • View dashboard: ${GREEN}npm run test:dashboard${NC}"
echo ""
