git commit -m "docs: Add comprehensive warmth score architecture and frontend integration guide

Created WARMTH_SCORE_ARCHITECTURE.md (900+ lines):
- Current EWMA-based architecture explanation
- Mathematical formulas and decay models
- Complete API endpoint reference
- Bulk warmth fetching patterns
- Centralized WarmthManager class
- React hooks examples
- Frontend integration best practices
- Migration notes from old system

Updated WARMTH_SCORING_SYSTEM.md:
- Added deprecation notice
- Marked as legacy documentation
- Links to new architecture doc

Covers:
- 5 API endpoints for warmth data
- 3 bulk fetching patterns
- Centralized warmth manager implementation
- Cache strategy (5-minute freshness)
- React hooks (useWarmth, useBulkWarmth, useWarmthSummary)
- Usage examples for list pages, dashboards, detail pages

Ready for frontend team to implement centralized warmth fetching"

git push origin feat/dev-dashboard
