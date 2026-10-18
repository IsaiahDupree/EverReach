# Backend Tracking Events API Test
**Test ID**: `7a91fc10-7dc8-485c-910a-34a36bc96379`
**Timestamp**: 2025-11-21T23:14:03.871Z

## Test Setup
- Backend URL: http://localhost:3000/api
- Test User ID: `test-user-7a91fc10-7dc8-485c-910a-34a36bc96379`

## Test 1: Setup
- ✅ Authentication successful

## Test 2: Track Single Event
- Single event tracked
- Status: 200
- Event Type: test_single_event

## Test 3: Track Multiple Events
- All 3 events tracked
- Processed: 3/3

## Test 4: Test Event with Rich Metadata
- Rich event tracked successfully
- Status: 200
- Event Type: test_rich_event

## Test 5: Test Error Handling
- ✅ Invalid event rejected
- Error: event_type is required

## ✅ All Tests Completed
- Single event tracking: Working
- Multiple events: Working
- Rich metadata: Working
- Error handling: Working