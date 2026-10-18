# E2E Test: Voice Note Processing

**Started**: 2025-10-30T02:27:24.288Z
**API Base**: https://ever-reach-be.vercel.app

### ❌ Process Voice Note (AI Extraction)

**Error**: createPersonaNote expected 201, got 400: [
  {
    "received": "audio",
    "code": "invalid_enum_value",
    "options": [
      "text",
      "voice"
    ],
    "path": [
      "type"
    ],
    "message": "Invalid enum value. Expected 'text' | 'voice', received 'audio'"
  }
]

### ❌ Full Voice Note Flow

**Error**: createPersonaNote expected 201, got 400: [
  {
    "received": "audio",
    "code": "invalid_enum_value",
    "options": [
      "text",
      "voice"
    ],
    "path": [
      "type"
    ],
    "message": "Invalid enum value. Expected 'text' | 'voice', received 'audio'"
  }
]


## Test Results

**Passed**: 2 | **Failed**: 2 | **Total**: 4

| Test | Status | Duration |
|------|--------|----------|
| Upload Audio | ✅ PASS | 633ms |
| Transcribe Audio | ✅ PASS | 385ms |
| Process Voice Note (AI Extraction) | ❌ FAIL | 1761791245751ms |
| Full Voice Note Flow | ❌ FAIL | 1761791246292ms |

**Exit Code**: 1