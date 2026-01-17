git commit -m "docs: Add comprehensive frontend tracking implementation guide

Created FRONTEND_TRACKING_IMPLEMENTATION.md (1,000+ lines):

Complete guide for implementing page and button tracking in React Native/Expo:

Setup & Installation:
- PostHog integration (optional)
- Environment variables
- Dependency installation

Core Components (3):
1. Analytics Wrapper (lib/analytics/analytics.ts)
   - Route manifest registration
   - Event tracking (PostHog + backend)
   - User identity management
   - Page contract registration

2. Screen Tracking Hook (hooks/useScreenTracking.ts)
   - Auto-track screen views
   - Track time-on-page
   - AppState background handling

3. TrackedPressable Component (components/TrackedPressable.tsx)
   - Drop-in Pressable replacement
   - Auto-registers element contracts
   - Enforces stable IDs + labels

Implementation Patterns:
- Automatic page view tracking (no code needed)
- Button tap tracking with TrackedPressable
- Custom event tracking
- Critical page marking
- Contextual event properties

Best Practices:
- Naming conventions (snake_case IDs)
- What to track (CTAs, nav, forms) vs. skip (decorative, text)
- ID stability (no random IDs)
- Human-readable labels
- Performance considerations

Testing & Verification:
- Check coverage API
- View dashboard stats
- Debug event flow

Complete Examples:
- Full home page implementation
- A/B test tracking
- Feature flag tracking
- Conditional tracking

Migration Strategy (4 weeks):
- Week 1: Core pages (5 routes)
- Week 2: High-traffic pages (10 routes)
- Week 3: Complete coverage (all 54 routes)
- Week 4: Optimization + alerts

Ready for frontend team to implement 100% tracking coverage!"

git push origin feat/dev-dashboard
