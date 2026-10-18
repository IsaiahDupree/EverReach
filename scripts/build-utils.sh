#!/bin/bash

###############################################################################
# Build Utilities - Verbose Logging, Timeout, and Error Reporting
# 
# This script provides utilities for build scripts:
# - Maximum verbosity with timestamps
# - Timeout handling with automatic cancellation
# - Comprehensive error reporting
# - Failure analysis and shutdown reports
#
# Usage:
#   source scripts/build-utils.sh
#   setup_build_environment "Build Name" 3600  # 1 hour timeout
#   run_with_timeout "command" "Description"
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Global variables
BUILD_NAME=""
BUILD_START_TIME=""
BUILD_TIMEOUT=0
BUILD_LOG_DIR=""
BUILD_LOG_FILE=""
BUILD_ERROR_LOG=""
BUILD_REPORT_FILE=""
TIMEOUT_PID=""
SCRIPT_PID=""
VERBOSE_MODE=true
FAILED_COMMANDS=()
FAILED_STEPS=()

###############################################################################
# Setup Functions
###############################################################################

# Initialize build environment
# Usage: setup_build_environment "Build Name" [timeout_seconds] [log_dir]
setup_build_environment() {
    BUILD_NAME="${1:-Build}"
    BUILD_TIMEOUT="${2:-3600}"  # Default 1 hour
    local log_dir="${3:-/tmp/build-logs}"
    
    BUILD_START_TIME=$(date +%s)
    BUILD_LOG_DIR="$log_dir/$(date +%Y%m%d_%H%M%S)_${BUILD_NAME// /_}"
    BUILD_LOG_FILE="$BUILD_LOG_DIR/build.log"
    BUILD_ERROR_LOG="$BUILD_LOG_DIR/errors.log"
    BUILD_REPORT_FILE="$BUILD_LOG_DIR/failure-report.txt"
    
    # Create log directory
    mkdir -p "$BUILD_LOG_DIR"
    
    # Initialize log files
    echo "" > "$BUILD_LOG_FILE"
    echo "" > "$BUILD_ERROR_LOG"
    
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "🚀 Starting: $BUILD_NAME"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Start Time: $(date)"
    log_info "Timeout: ${BUILD_TIMEOUT}s ($(($BUILD_TIMEOUT / 60)) minutes)"
    log_info "Log Directory: $BUILD_LOG_DIR"
    log_info "PID: $$"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Setup timeout handler
    setup_timeout_handler
    
    # Setup exit handlers
    trap cleanup_on_exit EXIT INT TERM
    
    # Log system info
    log_system_info
}

# Setup timeout handler
setup_timeout_handler() {
    if [ "$BUILD_TIMEOUT" -gt 0 ]; then
        (
            sleep "$BUILD_TIMEOUT"
            log_error "⏰ TIMEOUT: Build exceeded ${BUILD_TIMEOUT}s timeout"
            generate_failure_report "TIMEOUT" "Build exceeded maximum time limit of ${BUILD_TIMEOUT} seconds"
            kill -TERM $$ 2>/dev/null || true
        ) &
        TIMEOUT_PID=$!
        log_verbose "Timeout handler started (PID: $TIMEOUT_PID, timeout: ${BUILD_TIMEOUT}s)"
    fi
}

# Log system information
log_system_info() {
    log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_verbose "📊 System Information"
    log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_verbose "OS: $(uname -a)"
    log_verbose "Node: $(node --version 2>/dev/null || echo 'Not installed')"
    log_verbose "npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    log_verbose "Xcode: $(xcodebuild -version 2>/dev/null | head -1 || echo 'Not installed')"
    log_verbose "CocoaPods: $(pod --version 2>/dev/null || echo 'Not installed')"
    log_verbose "Expo CLI: $(npx expo --version 2>/dev/null || echo 'Not installed')"
    log_verbose "Disk Space: $(df -h . | tail -1 | awk '{print $4 " available"}')"
    log_verbose "Memory: $(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%.2f MiB %s\n", $2 * $size / 1048576, $1)' | head -1)"
    log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

###############################################################################
# Logging Functions
###############################################################################

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Log with timestamp and verbosity
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(get_timestamp)
    local log_entry="[$timestamp] [$level] $message"
    
    # Always write to log file
    echo "$log_entry" >> "$BUILD_LOG_FILE"
    
    # Print to console based on level
    case "$level" in
        ERROR|CRITICAL)
            echo -e "${RED}$log_entry${NC}" >&2
            echo "$log_entry" >> "$BUILD_ERROR_LOG"
            ;;
        WARN)
            echo -e "${YELLOW}$log_entry${NC}"
            ;;
        SUCCESS)
            echo -e "${GREEN}$log_entry${NC}"
            ;;
        INFO)
            echo -e "${BLUE}$log_entry${NC}"
            ;;
        VERBOSE)
            if [ "$VERBOSE_MODE" = true ]; then
                echo -e "${CYAN}$log_entry${NC}"
            fi
            ;;
        STEP)
            echo -e "${MAGENTA}$log_entry${NC}"
            ;;
        *)
            echo "$log_entry"
            ;;
    esac
}

# Convenience logging functions
log_info() { log "INFO" "$@"; }
log_verbose() { log "VERBOSE" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_step() { log "STEP" "$@"; }
log_critical() { log "CRITICAL" "$@"; }

# Log command execution
log_command() {
    local description="$1"
    local command="$2"
    
    log_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_step "▶  Executing: $description"
    log_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_verbose "Command: $command"
    log_verbose "Working Directory: $(pwd)"
    log_verbose "User: $(whoami)"
}

###############################################################################
# Execution Functions
###############################################################################

# Run command with timeout, logging, and error handling
# Usage: run_with_timeout "command" "description" [timeout_seconds]
run_with_timeout() {
    local command="$1"
    local description="${2:-Running command}"
    local step_timeout="${3:-$BUILD_TIMEOUT}"
    local start_time=$(date +%s)
    
    log_command "$description" "$command"
    
    # Create temporary files for output
    local stdout_file=$(mktemp)
    local stderr_file=$(mktemp)
    local exit_code_file=$(mktemp)
    
    # Execute command with timeout
    (
        eval "$command" > "$stdout_file" 2> "$stderr_file"
        echo $? > "$exit_code_file"
    ) &
    local cmd_pid=$!
    
    # Wait for command with timeout
    local elapsed=0
    while kill -0 $cmd_pid 2>/dev/null; do
        sleep 1
        elapsed=$((elapsed + 1))
        
        # Check timeout
        if [ $elapsed -ge $step_timeout ]; then
            log_error "⏰ Command timeout after ${elapsed}s: $description"
            kill -TERM $cmd_pid 2>/dev/null || true
            sleep 2
            kill -KILL $cmd_pid 2>/dev/null || true
            FAILED_COMMANDS+=("$description (TIMEOUT after ${elapsed}s)")
            FAILED_STEPS+=("$description")
            return 124  # Timeout exit code
        fi
        
        # Log progress every 30 seconds
        if [ $((elapsed % 30)) -eq 0 ]; then
            log_verbose "⏳ Still running... (${elapsed}s elapsed)"
        fi
    done
    
    # Get exit code
    wait $cmd_pid 2>/dev/null
    local exit_code=$(cat "$exit_code_file" 2>/dev/null || echo "1")
    
    # Calculate elapsed time
    local end_time=$(date +%s)
    local elapsed_time=$((end_time - start_time))
    
    # Log output
    if [ -s "$stdout_file" ]; then
        log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_verbose "📤 STDOUT:"
        while IFS= read -r line; do
            log_verbose "   $line"
        done < "$stdout_file"
        log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
    
    if [ -s "$stderr_file" ]; then
        log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_verbose "📥 STDERR:"
        while IFS= read -r line; do
            if echo "$line" | grep -qi "error\|fail\|warning"; then
                log_warn "   $line"
            else
                log_verbose "   $line"
            fi
        done < "$stderr_file"
        log_verbose "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
    
    # Check result
    if [ "$exit_code" -eq 0 ]; then
        log_success "✅ Completed: $description (${elapsed_time}s)"
        rm -f "$stdout_file" "$stderr_file" "$exit_code_file"
        return 0
    else
        log_error "❌ Failed: $description (exit code: $exit_code, ${elapsed_time}s)"
        FAILED_COMMANDS+=("$description (exit code: $exit_code)")
        FAILED_STEPS+=("$description")
        
        # Save error output
        if [ -s "$stderr_file" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$BUILD_ERROR_LOG"
            echo "FAILED: $description" >> "$BUILD_ERROR_LOG"
            echo "Exit Code: $exit_code" >> "$BUILD_ERROR_LOG"
            echo "Time: ${elapsed_time}s" >> "$BUILD_ERROR_LOG"
            cat "$stderr_file" >> "$BUILD_ERROR_LOG"
            echo "" >> "$BUILD_ERROR_LOG"
        fi
        
        rm -f "$stdout_file" "$stderr_file" "$exit_code_file"
        return $exit_code
    fi
}

# Run command without timeout (uses global timeout)
# Usage: run_command "command" "description"
run_command() {
    run_with_timeout "$1" "$2" "$BUILD_TIMEOUT"
}

# Run command and continue on error (logs but doesn't fail)
# Usage: run_command_continue "command" "description"
run_command_continue() {
    set +e
    run_command "$1" "$2"
    local exit_code=$?
    set -e
    return $exit_code
}

###############################################################################
# Error Reporting Functions
###############################################################################

# Generate comprehensive failure report
generate_failure_report() {
    local failure_type="${1:-UNKNOWN}"
    local failure_reason="${2:-Unknown error}"
    local end_time=$(date +%s)
    local total_time=$((end_time - BUILD_START_TIME))
    
    log_critical "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_critical "❌ BUILD FAILURE REPORT"
    log_critical "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "BUILD FAILURE REPORT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Build Name: $BUILD_NAME"
        echo "Failure Type: $failure_type"
        echo "Failure Reason: $failure_reason"
        echo ""
        echo "Timing:"
        echo "  Start Time: $(date -r $BUILD_START_TIME)"
        echo "  End Time: $(date -r $end_time)"
        echo "  Total Duration: ${total_time}s ($(($total_time / 60))m $(($total_time % 60))s)"
        echo ""
        echo "System Information:"
        echo "  OS: $(uname -a)"
        echo "  Node: $(node --version 2>/dev/null || echo 'Not installed')"
        echo "  npm: $(npm --version 2>/dev/null || echo 'Not installed')"
        echo "  Xcode: $(xcodebuild -version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "  CocoaPods: $(pod --version 2>/dev/null || echo 'Not installed')"
        echo "  Expo CLI: $(npx expo --version 2>/dev/null || echo 'Not installed')"
        echo ""
        echo "Failed Steps:"
        if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
            echo "  (none recorded)"
        else
            for i in "${!FAILED_STEPS[@]}"; do
                echo "  $((i+1)). ${FAILED_STEPS[$i]}"
            done
        fi
        echo ""
        echo "Failed Commands:"
        if [ ${#FAILED_COMMANDS[@]} -eq 0 ]; then
            echo "  (none recorded)"
        else
            for i in "${!FAILED_COMMANDS[@]}"; do
                echo "  $((i+1)). ${FAILED_COMMANDS[$i]}"
            done
        fi
        echo ""
        echo "Log Files:"
        echo "  Full Log: $BUILD_LOG_FILE"
        echo "  Error Log: $BUILD_ERROR_LOG"
        echo "  This Report: $BUILD_REPORT_FILE"
        echo ""
        echo "Recent Errors (last 50 lines):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -50 "$BUILD_ERROR_LOG" 2>/dev/null || echo "  (no errors logged)"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    } | tee "$BUILD_REPORT_FILE"
    
    log_critical "Full report saved to: $BUILD_REPORT_FILE"
    log_critical "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Generate success report
generate_success_report() {
    local end_time=$(date +%s)
    local total_time=$((end_time - BUILD_START_TIME))
    
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "✅ BUILD SUCCESS REPORT"
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Build Name: $BUILD_NAME"
    log_success "Total Duration: ${total_time}s ($(($total_time / 60))m $(($total_time % 60))s)"
    log_success "Log Directory: $BUILD_LOG_DIR"
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

###############################################################################
# Cleanup Functions
###############################################################################

# Cleanup on exit
cleanup_on_exit() {
    local exit_code=$?
    
    # Kill timeout handler if still running
    if [ -n "$TIMEOUT_PID" ] && kill -0 "$TIMEOUT_PID" 2>/dev/null; then
        kill -TERM "$TIMEOUT_PID" 2>/dev/null || true
    fi
    
    # Generate report based on exit code
    if [ $exit_code -eq 0 ]; then
        generate_success_report
    else
        if [ $exit_code -eq 124 ] || [ $exit_code -eq 143 ]; then
            generate_failure_report "TIMEOUT" "Build was terminated due to timeout"
        else
            generate_failure_report "EXECUTION_ERROR" "Build failed with exit code: $exit_code"
        fi
    fi
    
    # Print log location
    echo ""
    log_info "📁 Logs saved to: $BUILD_LOG_DIR"
    log_info "   - Full log: $BUILD_LOG_FILE"
    log_info "   - Errors: $BUILD_ERROR_LOG"
    if [ $exit_code -ne 0 ]; then
        log_info "   - Failure report: $BUILD_REPORT_FILE"
    fi
    echo ""
    
    exit $exit_code
}

###############################################################################
# Utility Functions
###############################################################################

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify required commands
verify_requirements() {
    local missing=()
    local required=("node" "npm" "npx")
    
    for cmd in "${required[@]}"; do
        if ! command_exists "$cmd"; then
            missing+=("$cmd")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required commands: ${missing[*]}"
        return 1
    fi
    
    return 0
}

# Get elapsed time since build start
get_elapsed_time() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - BUILD_START_TIME))
    echo "$elapsed"
}

# Format time
format_time() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    
    if [ $hours -gt 0 ]; then
        printf "%dh %dm %ds" $hours $minutes $secs
    elif [ $minutes -gt 0 ]; then
        printf "%dm %ds" $minutes $secs
    else
        printf "%ds" $secs
    fi
}


