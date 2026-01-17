git commit -m "feat: Add complete app analytics tracking system

Backend Infrastructure for Developer Dashboard:

Database Schema (5 tables):
- tracking_route_manifest: Expected pages from app build
- tracking_contracts: Required elements per route
- tracking_route_seen: Actual page views + time-on-page
- tracking_element_seen: Button tap tracking
- tracking_events: Raw event log

Views (5):
- tracking_missing_routes: Pages never visited
- tracking_missing_elements: Buttons never tapped
- tracking_coverage_summary: Overall stats
- tracking_popular_routes: Most viewed pages
- tracking_element_engagement: Most tapped buttons

Functions (4):
- increment_route_views: Atomic view counter
- add_route_duration: Add time-on-page
- increment_element_taps: Track button taps
- get_coverage_report: Complete coverage JSON

API Endpoints (5):
- POST /v1/tracking/register-manifest: Register app pages
- POST /v1/tracking/contract: Register expected elements
- POST /v1/tracking/event: Ingest analytics events
- GET /v1/tracking/coverage: Get missing coverage
- GET /v1/tracking/dashboard: Full analytics dashboard

Tracks 54+ Mobile App Routes:
- 4 tabs, 5 contact screens, 3 messaging screens
- 8 settings screens, 2 imports, 2 notes
- 13 test/debug screens, 4 auth screens
- Dynamic routes: /contact/[id], etc.

Event Types Supported:
- screen_view: Page visit
- screen_duration: Time on page
- ui_press: Button tap
- Custom events: Any string

Coverage Features:
- Know which pages are never visited
- Know which buttons are never tapped
- Track engagement per route
- Measure time-on-page
- Support authed vs anonymous users
- Per-version tracking

Migration Applied:
- 5 tables created
- 5 views created
- 4 helper functions created
- 20+ indexes for performance

Documentation:
- docs/APP_ANALYTICS_TRACKING_SYSTEM.md (complete guide)
- All API endpoints documented
- Mobile integration examples
- Developer dashboard queries

Ready for:
- Backend deployment to Vercel
- Mobile app analytics wrapper
- Developer dashboard UI
- Real-time coverage monitoring"

git push origin feat/dev-dashboard
