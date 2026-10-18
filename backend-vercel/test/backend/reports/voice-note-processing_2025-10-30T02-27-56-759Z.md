# E2E Test: Voice Note Processing

**Started**: 2025-10-30T02:27:54.233Z
**API Base**: https://ever-reach-be.vercel.app

### ❌ Process Voice Note (AI Extraction)

**Error**: createPersonaNote expected 201, got 400: [
  {
    "code": "custom",
    "message": "For type=text, body_text is required. For type=voice, file_url is required.",
    "path": []
  }
]

### ❌ Full Voice Note Flow

**Error**: createPersonaNote expected 201, got 400: [
  {
    "code": "custom",
    "message": "For type=text, body_text is required. For type=voice, file_url is required.",
    "path": []
  }
]


## Test Results

**Passed**: 2 | **Failed**: 2 | **Total**: 4

| Test | Status | Duration |
|------|--------|----------|
| Upload Audio | ✅ PASS | 769ms |
| Transcribe Audio | ✅ PASS | 668ms |
| Process Voice Note (AI Extraction) | ❌ FAIL | 1761791276164ms |
| Full Voice Note Flow | ❌ FAIL | 1761791276758ms |

**Exit Code**: 1