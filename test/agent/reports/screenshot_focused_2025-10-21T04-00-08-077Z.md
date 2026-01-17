# Screenshot Analysis Focused Test Report

**Generated**: 2025-10-21T04:00:08.078Z
**Backend**: https://ever-reach-be.vercel.app

## Summary

- **Total Tests**: 6
- **Passed**: ✅ 0
- **Failed**: ❌ 6
- **Success Rate**: 0.0%

## Test Results

| Test | Status | Duration |
|------|--------|----------|
| Upload screenshot with business_card context | ❌ FAIL | 261ms |
| Get screenshot details | ❌ FAIL | 0ms |
| List user screenshots | ❌ FAIL | 409ms |
| Trigger manual analysis | ❌ FAIL | 0ms |
| Delete screenshot | ❌ FAIL | 0ms |
| Verify screenshot is deleted (404) | ❌ FAIL | 0ms |

## Details

### ❌ Upload screenshot with business_card context

- **Duration**: 261ms
- **Error**: Expected 201, got 500: {"error":"Upload failed","details":"Input buffer contains unsupported image format"}

500 !== 201


### ❌ Get screenshot details

- **Duration**: 0ms
- **Error**: Requires screenshot_id from previous test

### ❌ List user screenshots

- **Duration**: 409ms
- **Error**: Should return array of screenshots

### ❌ Trigger manual analysis

- **Duration**: 0ms
- **Error**: Requires screenshot_id from previous test

### ❌ Delete screenshot

- **Duration**: 0ms
- **Error**: Requires screenshot_id from previous test

### ❌ Verify screenshot is deleted (404)

- **Duration**: 0ms
- **Error**: Requires screenshot_id from previous test
