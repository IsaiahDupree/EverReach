# Build Scripts - Verbose Logging & Error Reporting

## Overview

All build scripts have been enhanced with:
- **Maximum verbosity** with timestamps and detailed logging
- **Timeout handling** with automatic cancellation
- **Comprehensive error reporting** with failure analysis
- **Shutdown reports** on failure or timeout

## Updated Scripts

### Core Build Scripts

1. **`scripts/build-ios-expo.sh`** - Expo-based iOS builds
   - Usage: `./scripts/build-ios-expo.sh [device] [action] [timeout_minutes]`
   - Default timeout: 60 minutes
   - Actions: `open`, `build`, `run`, `build-and-run`

2. **`scripts/xcode-build.sh`** - Xcode-based builds
   - Usage: `./scripts/xcode-build.sh [device] [config] [action] [timeout_minutes]`
   - Default timeout: 90 minutes
   - Actions: `build`, `run`, `archive`, `clean-build`, `build-and-run`

3. **`scripts/ci-build-test.sh`** - CI-friendly build testing
   - Usage: `./scripts/ci-build-test.sh [build_config] [timeout_minutes]`
   - Default timeout: 60 minutes
   - Returns proper exit codes for CI/CD

4. **`fix-native-modules.sh`** - Fix native module errors
   - Usage: `./fix-native-modules.sh`
   - Default timeout: 90 minutes
   - Comprehensive cleanup and rebuild

5. **`start-all.sh`** - Start backend + iOS build
   - Usage: `./start-all.sh [timeout_minutes]`
   - Default timeout: 120 minutes

## Build Utilities (`scripts/build-utils.sh`)

All scripts source the build utilities which provide:

### Features

- **Verbose Logging**: All commands logged with timestamps
- **Timeout Management**: Automatic cancellation after timeout
- **Error Tracking**: Failed commands and steps tracked
- **System Information**: Logs OS, Node, Xcode, CocoaPods versions
- **Failure Reports**: Comprehensive reports on build failure
- **Success Reports**: Summary on successful builds

### Logging Levels

- `INFO` - General information (blue)
- `VERBOSE` - Detailed debugging (cyan)
- `SUCCESS` - Successful operations (green)
- `WARN` - Warnings (yellow)
- `ERROR` - Errors (red)
- `CRITICAL` - Critical failures (red, bold)
- `STEP` - Major build steps (magenta)

### Log Files

All builds create a log directory in `/tmp/build-logs/` with:
- `build.log` - Complete build log with all output
- `errors.log` - Only errors and failures
- `failure-report.txt` - Comprehensive failure analysis (on failure)

## Usage Examples

### Basic Build with Default Timeout

```bash
cd mobileapp
./scripts/build-ios-expo.sh "iPad Pro 13-inch (M4)" run
```

### Build with Custom Timeout

```bash
# 2 hour timeout
./scripts/build-ios-expo.sh "iPhone 17 Pro" run 120
```

### CI Build Test

```bash
# Test Debug build with 90 minute timeout
./scripts/ci-build-test.sh Debug 90
```

### Xcode Build

```bash
# Build Release configuration
./scripts/xcode-build.sh "iPad Pro 13-inch (M4)" Release build 120
```

## Timeout Behavior

When a timeout occurs:

1. **Immediate Cancellation**: Build process is terminated
2. **Timeout Report**: Detailed report generated
3. **Error Logging**: All errors saved to log files
4. **Exit Code**: Script exits with code 124 (timeout)

## Failure Reports

On any failure, a comprehensive report is generated including:

- Build name and failure type
- Timing information (start, end, duration)
- System information (OS, Node, Xcode versions)
- Failed steps and commands
- Recent errors from logs
- Log file locations

### Example Failure Report Location

```
/tmp/build-logs/20250123_143022_iOS_Expo_Build_run/failure-report.txt
```

## Verbose Output

All scripts now output:

- **Timestamps** on every log entry
- **Command execution** details
- **STDOUT/STDERR** capture and logging
- **Progress indicators** for long-running commands
- **System information** at start
- **Elapsed time** for each step

## Environment Variables

Scripts respect:
- `VERBOSE_MODE` - Set to `false` to reduce verbosity (default: `true`)

## Exit Codes

- `0` - Success
- `1` - General error
- `124` - Timeout
- `143` - Terminated (SIGTERM)

## Best Practices

1. **Always check logs** after a failed build
2. **Use appropriate timeouts** for your build type
3. **Review failure reports** for detailed analysis
4. **Check system info** in logs if builds fail unexpectedly

## Log Directory Structure

```
/tmp/build-logs/
└── YYYYMMDD_HHMMSS_Build_Name/
    ├── build.log          # Complete log
    ├── errors.log         # Errors only
    └── failure-report.txt # Failure analysis (if failed)
```

## Troubleshooting

### Build Times Out

1. Check failure report for which step timed out
2. Review system resources (disk space, memory)
3. Increase timeout if build is legitimately slow
4. Check for hanging processes

### No Logs Generated

1. Verify script has execute permissions
2. Check `/tmp/build-logs/` directory exists and is writable
3. Review script output for initialization errors

### Verbose Output Too Much

Set `VERBOSE_MODE=false` before running:
```bash
export VERBOSE_MODE=false
./scripts/build-ios-expo.sh
```

## Integration with CI/CD

The `ci-build-test.sh` script is designed for CI/CD:

- Returns proper exit codes
- Logs to files for artifact collection
- Provides summary statistics
- Handles timeouts gracefully

Example CI usage:
```bash
./scripts/ci-build-test.sh Release 90
if [ $? -eq 0 ]; then
    echo "Build succeeded"
else
    echo "Build failed - check logs"
    cat /tmp/build-logs/*/failure-report.txt
    exit 1
fi
```


