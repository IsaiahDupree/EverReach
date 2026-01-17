#!/bin/bash
#
# iOS Build Script with Maximum Verbosity and Failure Reporting
# Usage: ./scripts/ios-build-verbose.sh [device_name] [timeout_seconds]
#
# Features:
# - Maximum verbosity for all build phases
# - Time tracking per phase
# - Timeout handling with detailed report
# - Trap handlers for SIGINT/SIGTERM with shutdown report
# - Detailed failure analysis
#

set -o pipefail

# Configuration
DEVICE_NAME="${1:-iPhone 16e}"
TIMEOUT_SECONDS="${2:-600}"  # Default 10 minutes
LOG_DIR="$(pwd)/build-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/ios-build-${TIMESTAMP}.log"
PHASE_LOG="${LOG_DIR}/phase-times-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# State tracking
CURRENT_PHASE=""
PHASE_START_TIME=0
BUILD_START_TIME=$(date +%s)
PHASES_COMPLETED=()
LAST_OUTPUT_LINE=""
XCODE_PID=""

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

log_phase() {
    local phase="$1"
    local status="$2"
    local duration="$3"
    echo "[$(date '+%H:%M:%S')] Phase: $phase | Status: $status | Duration: ${duration}s" >> "$PHASE_LOG"
}

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║           iOS BUILD WITH MAXIMUM VERBOSITY                       ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  Device: $(printf '%-54s' "$DEVICE_NAME")  ║"
    echo "║  Timeout: $(printf '%-53s' "${TIMEOUT_SECONDS}s")  ║"
    echo "║  Log: $(printf '%-57s' "$LOG_FILE")  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_shutdown_report() {
    local exit_reason="$1"
    local elapsed=$(($(date +%s) - BUILD_START_TIME))
    
    echo -e "\n${RED}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    BUILD SHUTDOWN REPORT                         ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo -e "║  ${YELLOW}Exit Reason:${RED} $(printf '%-51s' "$exit_reason")  ║"
    echo "║  Total Time: $(printf '%-50s' "${elapsed}s")  ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    
    if [ -n "$CURRENT_PHASE" ]; then
        local phase_elapsed=$(($(date +%s) - PHASE_START_TIME))
        echo "║  ${YELLOW}FAILED/STUCK PHASE:${RED}                                           ║"
        echo "║    $(printf '%-62s' "$CURRENT_PHASE")  ║"
        echo "║    Running for: $(printf '%-47s' "${phase_elapsed}s")  ║"
    fi
    
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  ${GREEN}COMPLETED PHASES:${RED}                                              ║"
    
    if [ ${#PHASES_COMPLETED[@]} -eq 0 ]; then
        echo "║    (none)                                                        ║"
    else
        for phase in "${PHASES_COMPLETED[@]}"; do
            echo "║    ✓ $(printf '%-60s' "$phase")  ║"
        done
    fi
    
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  ${YELLOW}LAST OUTPUT:${RED}                                                   ║"
    echo "║    $(printf '%-62s' "${LAST_OUTPUT_LINE:0:62}")  ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  Full log: $LOG_FILE"
    echo "║  Phase log: $PHASE_LOG"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Also write to log file
    {
        echo ""
        echo "=== SHUTDOWN REPORT ==="
        echo "Exit Reason: $exit_reason"
        echo "Total Time: ${elapsed}s"
        echo "Current Phase: $CURRENT_PHASE"
        echo "Phase Duration: ${phase_elapsed:-0}s"
        echo "Completed Phases: ${PHASES_COMPLETED[*]}"
        echo "Last Output: $LAST_OUTPUT_LINE"
    } >> "$LOG_FILE"
}

# Cleanup function
cleanup() {
    if [ -n "$XCODE_PID" ]; then
        log "${YELLOW}Killing xcodebuild process (PID: $XCODE_PID)${NC}"
        kill -9 "$XCODE_PID" 2>/dev/null
        # Also kill any child processes
        pkill -9 -P "$XCODE_PID" 2>/dev/null
    fi
    # Kill any orphaned xcodebuild processes
    pkill -9 xcodebuild 2>/dev/null
}

# Trap handlers
handle_interrupt() {
    log "${RED}Received SIGINT (Ctrl+C)${NC}"
    cleanup
    print_shutdown_report "User Cancelled (SIGINT)"
    exit 130
}

handle_terminate() {
    log "${RED}Received SIGTERM${NC}"
    cleanup
    print_shutdown_report "Terminated (SIGTERM)"
    exit 143
}

handle_timeout() {
    log "${RED}Build exceeded timeout of ${TIMEOUT_SECONDS}s${NC}"
    cleanup
    print_shutdown_report "Timeout Exceeded (${TIMEOUT_SECONDS}s)"
    exit 124
}

trap handle_interrupt SIGINT
trap handle_terminate SIGTERM

# Phase detection from build output
detect_phase() {
    local line="$1"
    local new_phase=""
    
    # Detect various build phases
    if [[ "$line" == *"Planning build"* ]]; then
        new_phase="Planning Build"
    elif [[ "$line" == *"Executing"*"»"* ]]; then
        # Extract the full phase name
        new_phase=$(echo "$line" | sed 's/.*Executing //' | sed 's/›.*//' | tr -d '[:space:]' | head -c 60)
    elif [[ "$line" == *"Compiling"* ]]; then
        new_phase="Compiling: $(echo "$line" | sed 's/.*Compiling //' | head -c 40)"
    elif [[ "$line" == *"Linking"* ]]; then
        new_phase="Linking"
    elif [[ "$line" == *"Signing"* ]]; then
        new_phase="Code Signing"
    elif [[ "$line" == *"Installing"* && "$line" == *"to"* ]]; then
        new_phase="Installing to Device"
    elif [[ "$line" == *"pod install"* ]]; then
        new_phase="CocoaPods Install"
    elif [[ "$line" == *"[CP]"* ]]; then
        new_phase="CocoaPods: $(echo "$line" | grep -o '\[CP\].*' | head -c 50)"
    elif [[ "$line" == *"[Hermes]"* ]]; then
        new_phase="Hermes: $(echo "$line" | grep -o '\[Hermes\].*' | head -c 50)"
    fi
    
    if [ -n "$new_phase" ] && [ "$new_phase" != "$CURRENT_PHASE" ]; then
        # Log completion of previous phase
        if [ -n "$CURRENT_PHASE" ]; then
            local phase_duration=$(($(date +%s) - PHASE_START_TIME))
            PHASES_COMPLETED+=("$CURRENT_PHASE (${phase_duration}s)")
            log_phase "$CURRENT_PHASE" "completed" "$phase_duration"
            log "${GREEN}✓ Completed:${NC} $CURRENT_PHASE (${phase_duration}s)"
        fi
        
        # Start new phase
        CURRENT_PHASE="$new_phase"
        PHASE_START_TIME=$(date +%s)
        log "${BLUE}▶ Starting:${NC} $CURRENT_PHASE"
    fi
}

# Process build output line
process_line() {
    local line="$1"
    LAST_OUTPUT_LINE="${line:0:100}"
    
    # Detect phase changes
    detect_phase "$line"
    
    # Color code the output
    if [[ "$line" == *"error:"* ]] || [[ "$line" == *"Error:"* ]]; then
        echo -e "${RED}$line${NC}"
    elif [[ "$line" == *"warning:"* ]] || [[ "$line" == *"Warning:"* ]]; then
        echo -e "${YELLOW}$line${NC}"
    elif [[ "$line" == *"✓"* ]] || [[ "$line" == *"success"* ]] || [[ "$line" == *"Succeeded"* ]]; then
        echo -e "${GREEN}$line${NC}"
    elif [[ "$line" == "›"* ]]; then
        echo -e "${CYAN}$line${NC}"
    else
        echo "$line"
    fi
    
    # Also write to log
    echo "$line" >> "$LOG_FILE"
}

# Main build function
run_build() {
    print_header
    
    log "Starting iOS build..."
    log "Device: $DEVICE_NAME"
    log "Timeout: ${TIMEOUT_SECONDS}s"
    log ""
    
    # Start the build with timeout
    CURRENT_PHASE="Initialization"
    PHASE_START_TIME=$(date +%s)
    
    # Run expo build with unbuffered output
    (
        exec 2>&1
        npx expo run:ios --device "$DEVICE_NAME" --verbose 2>&1
    ) &
    XCODE_PID=$!
    
    log "Build process started (PID: $XCODE_PID)"
    
    # Monitor the build with timeout
    local start_time=$(date +%s)
    
    # Wait for process with timeout
    while kill -0 "$XCODE_PID" 2>/dev/null; do
        local elapsed=$(($(date +%s) - start_time))
        
        # Check timeout
        if [ $elapsed -ge $TIMEOUT_SECONDS ]; then
            handle_timeout
        fi
        
        # Show periodic status every 30 seconds
        if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            local phase_time=$(($(date +%s) - PHASE_START_TIME))
            log "${CYAN}[Status] ${elapsed}s elapsed | Current: $CURRENT_PHASE (${phase_time}s)${NC}"
        fi
        
        sleep 1
    done
    
    wait $XCODE_PID
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        local total_time=$(($(date +%s) - BUILD_START_TIME))
        echo -e "\n${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    BUILD SUCCESSFUL!                             ║"
        echo "╠══════════════════════════════════════════════════════════════════╣"
        echo "║  Total Time: $(printf '%-50s' "${total_time}s")  ║"
        echo "║  Phases Completed: $(printf '%-44s' "${#PHASES_COMPLETED[@]}")  ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
    else
        print_shutdown_report "Build Failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Alternative: Run with real-time output processing
run_build_realtime() {
    print_header
    
    log "Starting iOS build with real-time output..."
    log "Device: $DEVICE_NAME"
    log "Timeout: ${TIMEOUT_SECONDS}s"
    log ""
    
    CURRENT_PHASE="Initialization"
    PHASE_START_TIME=$(date +%s)
    
    # Use timeout command with the build
    timeout --signal=TERM --kill-after=10 "${TIMEOUT_SECONDS}s" \
        npx expo run:ios --device "$DEVICE_NAME" 2>&1 | \
    while IFS= read -r line; do
        process_line "$line"
    done
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 124 ]; then
        handle_timeout
    elif [ $exit_code -eq 0 ]; then
        local total_time=$(($(date +%s) - BUILD_START_TIME))
        echo -e "\n${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    BUILD SUCCESSFUL!                             ║"
        echo "╠══════════════════════════════════════════════════════════════════╣"
        echo "║  Total Time: $(printf '%-50s' "${total_time}s")  ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
    else
        print_shutdown_report "Build Failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Run the build
run_build_realtime
