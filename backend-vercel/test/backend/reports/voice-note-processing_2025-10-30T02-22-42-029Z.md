# E2E Test: Voice Note Processing

**Started**: 2025-10-30T02:22:40.954Z
**API Base**: https://ever-reach-be.vercel.app

### ❌ Upload Audio

**Error**: getPresignedURL expected 200/201, got 400: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "path"
    ],
    "message": "Required"
  }
]

### ❌ Transcribe Audio

**Error**: getPresignedURL expected 200/201, got 400: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "path"
    ],
    "message": "Required"
  }
]

### ❌ Process Voice Note (AI Extraction)

**Error**: processVoiceNote expected 200, got 400: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "note_id"
    ],
    "message": "Required"
  }
]

### ❌ Full Voice Note Flow

**Error**: getPresignedURL expected 200/201, got 400: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "path"
    ],
    "message": "Required"
  }
]


## Test Results

**Passed**: 0 | **Failed**: 4 | **Total**: 4

| Test | Status | Duration |
|------|--------|----------|
| Upload Audio | ❌ FAIL | 1761790961707ms |
| Transcribe Audio | ❌ FAIL | 1761790961855ms |
| Process Voice Note (AI Extraction) | ❌ FAIL | 1761790961959ms |
| Full Voice Note Flow | ❌ FAIL | 1761790962028ms |

**Exit Code**: 1