# E2E Test: Warmth Recompute

- **Run ID**: 6f75a470-aad6-4aad-94bb-008c079e2530
- **Timestamp**: 2025-10-19T22:16:34.767Z
- **Supabase URL**: https://utasetfxiqcrnwyfforx.supabase.co
- **Backend URL**: https://ever-reach-be.vercel.app

## Test Workflow: Recompute Warmth Scores

### Step 1: Create Test Contact

- ✅ Contact created: 88f1ca03-edc5-4a58-ae4b-f2d7f822f200
- Initial warmth: 0/100

### Step 2: Add Interaction

- ✅ Interaction added: 0de7c7f1-4ec7-4b72-8617-4183fecba2fb

### Step 3: Trigger Individual Warmth Recompute

- ✅ Recompute successful
- Warmth after recompute: 34/100
- Change: 0 → 34

### Step 4: Verify Warmth in Database

- Database warmth: 34/100
- Matches recompute response: ✅ Yes

### Step 5: Create Second Contact for Batch Test

- ✅ Second contact created: 668a3630-2f5a-4179-bbcc-36a364a192cd

### Step 6: Batch Warmth Recompute

- ✅ Batch recompute successful
- Contacts processed: 0

### Step 7: Cleanup Test Data

- ✅ Cleaned up 2 test contacts

---

## Summary

- **Tests Passed**: 6/6
- **Initial Warmth**: 0/100
- **After Recompute**: 34/100
- **Contacts Tested**: 2

✅ **All warmth recompute tests passed**

## Test Results

```json
[
  {
    "name": "Create test contact",
    "pass": "88f1ca03-edc5-4a58-ae4b-f2d7f822f200",
    "status": 201,
    "ms": 292,
    "contact_id": "88f1ca03-edc5-4a58-ae4b-f2d7f822f200",
    "initial_warmth": 0
  },
  {
    "name": "Add interaction",
    "pass": "0de7c7f1-4ec7-4b72-8617-4183fecba2fb",
    "status": 201,
    "ms": 157,
    "interaction_id": "0de7c7f1-4ec7-4b72-8617-4183fecba2fb"
  },
  {
    "name": "Trigger individual recompute",
    "pass": true,
    "status": 200,
    "ms": 939,
    "warmth_after": 34
  },
  {
    "name": "Verify warmth in database",
    "pass": true,
    "status": 200,
    "ms": 122,
    "db_warmth": 34,
    "matches_recompute": true
  },
  {
    "name": "Create second contact",
    "pass": "668a3630-2f5a-4179-bbcc-36a364a192cd",
    "status": 201,
    "ms": 207,
    "contact_id": "668a3630-2f5a-4179-bbcc-36a364a192cd"
  },
  {
    "name": "Batch recompute",
    "pass": true,
    "status": 200,
    "ms": 753,
    "contacts_processed": 0
  }
]
```

## Test Results

```json
[
  {
    "name": "Create test contact",
    "pass": "88f1ca03-edc5-4a58-ae4b-f2d7f822f200",
    "status": 201,
    "ms": 292,
    "contact_id": "88f1ca03-edc5-4a58-ae4b-f2d7f822f200",
    "initial_warmth": 0
  },
  {
    "name": "Add interaction",
    "pass": "0de7c7f1-4ec7-4b72-8617-4183fecba2fb",
    "status": 201,
    "ms": 157,
    "interaction_id": "0de7c7f1-4ec7-4b72-8617-4183fecba2fb"
  },
  {
    "name": "Trigger individual recompute",
    "pass": true,
    "status": 200,
    "ms": 939,
    "warmth_after": 34
  },
  {
    "name": "Verify warmth in database",
    "pass": true,
    "status": 200,
    "ms": 122,
    "db_warmth": 34,
    "matches_recompute": true
  },
  {
    "name": "Create second contact",
    "pass": "668a3630-2f5a-4179-bbcc-36a364a192cd",
    "status": 201,
    "ms": 207,
    "contact_id": "668a3630-2f5a-4179-bbcc-36a364a192cd"
  },
  {
    "name": "Batch recompute",
    "pass": true,
    "status": 200,
    "ms": 753,
    "contacts_processed": 0
  }
]
```