# Backend Tracking Events API Test
**Test ID**: `32638065-2cb6-48e4-85fd-a5cf61bbbec1`
**Timestamp**: 2025-11-21T23:12:02.009Z

## Test Setup
- Backend URL: http://localhost:3000/api
- Test User ID: `test-user-32638065-2cb6-48e4-85fd-a5cf61bbbec1`

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