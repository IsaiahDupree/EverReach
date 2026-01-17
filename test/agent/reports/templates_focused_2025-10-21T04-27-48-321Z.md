# Templates Focused Test Report

**Generated**: 2025-10-21T04:27:48.321Z
**Backend**: https://ever-reach-be.vercel.app

## Summary

- **Total Tests**: 7
- **Passed**: ✅ 0
- **Failed**: ❌ 7
- **Success Rate**: 0.0%

## Test Results

| Test | Status | Duration |
|------|--------|----------|
| Create message template | ❌ FAIL | 293ms |
| Get template by ID | ❌ FAIL | 0ms |
| List user templates | ❌ FAIL | 251ms |
| Update template | ❌ FAIL | 0ms |
| List templates filtered by channel | ❌ FAIL | 190ms |
| Delete template | ❌ FAIL | 0ms |
| Verify template is deleted (404) | ❌ FAIL | 0ms |

## Details

### ❌ Create message template

- **Duration**: 293ms
- **Error**: Expected 201, got 500: {"error":"Could not find the 'body_tmpl' column of 'templates' in the schema cache","request_id":"req_1db3a5760adb4311b059515bf148231c"}

500 !== 201


### ❌ Get template by ID

- **Duration**: 0ms
- **Error**: Requires template_id from previous test

### ❌ List user templates

- **Duration**: 251ms
- **Error**: Expected 200, got 500

500 !== 200


### ❌ Update template

- **Duration**: 0ms
- **Error**: Requires template_id from previous test

### ❌ List templates filtered by channel

- **Duration**: 190ms
- **Error**: Expected 200, got 500

500 !== 200


### ❌ Delete template

- **Duration**: 0ms
- **Error**: Requires template_id from previous test

### ❌ Verify template is deleted (404)

- **Duration**: 0ms
- **Error**: Requires template_id from previous test
