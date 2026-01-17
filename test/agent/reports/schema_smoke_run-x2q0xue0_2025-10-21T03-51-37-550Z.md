# Schema Smoke Test

- **Run ID**: 351929fb-d43d-464c-ba48-385e210f4724
- **Timestamp**: 2025-10-21T03:51:37.548Z

## Results

- ❌ feature_requests table — error: Missing env: TEST_EMAIL
- ❌ feature_votes table — error: Missing env: TEST_EMAIL
- ❌ feature_changelog table — error: Missing env: TEST_EMAIL
- ❌ feature_buckets table — error: Missing env: TEST_EMAIL
- ❌ feature_request_embeddings table — error: Missing env: TEST_EMAIL
- ❌ feature_activity table — error: Missing env: TEST_EMAIL
- ❌ feature_user_stats table — error: Missing env: TEST_EMAIL
- ❌ feature_bucket_rollups materialized view — error: Missing env: TEST_EMAIL
- ❌ templates table — error: Missing env: TEST_EMAIL
- ❌ persona_notes table — error: Missing env: TEST_EMAIL
- ❌ interactions table — error: Missing env: TEST_EMAIL
- ❌ warmth_alerts table — error: Missing env: TEST_EMAIL
- ❌ user_push_tokens table — error: Missing env: TEST_EMAIL
- ❌ contacts watch columns (watch_status, warmth_alert_threshold) — error: Missing env: TEST_EMAIL

**Summary**: 13 passed, 1 failed (see above)