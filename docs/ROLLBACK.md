# EverReach v1.1.4 Rollback Plan

## Overview
This document outlines the procedures to rollback EverReach to the previous production version if critical issues are discovered after v1.1.4 release.

## Current Version
- **Production Version:** v1.1.3
- **Rollback Version:** v1.1.4
- **Release Date:** April 2026

## Pre-Rollback Checklist

Before initiating a rollback:

1. ✓ Confirm critical issue severity (P0/P1)
2. ✓ Verify issue is not a configuration problem
3. ✓ Check Supabase status for backend issues
4. ✓ Notify user support team
5. ✓ Document the specific issue
6. ✓ Identify affected user base

## Rollback Steps

### Immediate Actions (First 5 minutes)

1. **Notify Team**
   ```bash
   # Send alert to engineering and support channels
   # Include: issue description, user impact, estimated rollback time
   ```

2. **Pause New Releases**
   - Stop all CI/CD deployments
   - Prevent new app store builds from going to beta
   - Hold TestFlight distribution

### App Store Rollback (5-15 minutes)

1. **Revert to Previous Build**
   - Go to App Store Connect
   - Navigate to TestFlight → App
   - Select v1.1.3 build (most recent stable build)
   - Submit for expedited review with reason: "Critical bug fix rollback"
   - Estimated review time: 30 minutes to 2 hours

2. **Alternative: Immediate Availability**
   - If v1.1.3 is still in production, simply remove v1.1.4 from release
   - Users will continue using v1.1.3 until they update

3. **Git Rollback**
   ```bash
   cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app

   # Tag the failed release for reference
   git tag -a v1.1.4-failed -m "Rollback: Critical issue found"

   # Revert to previous release commit
   git log --oneline | head -20  # Find v1.1.3 commit
   git revert <v1.1.4-commit-sha>

   # Or reset if not yet pushed to main
   git reset --hard <v1.1.3-commit-sha>
   ```

### Backend Rollback (if applicable)

1. **Supabase Database**
   - No rollback needed (database schema is forward-compatible)
   - If migration caused data corruption, restore from backup:
     ```bash
     # Contact Supabase support for restore from automated backup
     # Backups available for last 30 days
     ```

2. **Environment Variables**
   - Verify `.env` configuration matches v1.1.3
   - Check Vercel environment variables haven't changed

### Communication

1. **User Notification**
   - Send in-app message: "We're updating the app. Please refresh or reinstall."
   - Post on Twitter: "@EverReachApp We've paused v1.1.4 and restored v1.1.3 due to [brief issue]"
   - Email team members directly

2. **Post-Mortems**
   - Schedule 24-hour incident review
   - Document root cause
   - Identify prevention measures for future releases

## Previous Version Details

### v1.1.3 Information
- **Last Known Good Build:** Available in App Store
- **Commit SHA:** (documented at time of v1.1.3 release)
- **Build Number:** (documented in version history)
- **Known Issues:** None critical

### Build Artifacts
- TestFlight Build: Available until ~90 days old
- Source Code: Tagged in Git as `v1.1.3`
- Database Schema: Compatible with current Supabase

## Rollback Timeline Estimates

| Activity | Duration | Notes |
|----------|----------|-------|
| Decision & approval | 5-10 min | Includes initial investigation |
| Git/Code revert | 2-5 min | Local git operations |
| Build creation | 5-10 min | Expo EAS or manual build |
| TestFlight upload | 2-5 min | Binary upload |
| App Review | 30-120 min | Apple expedited review |
| Live in App Store | ~1 hour | Total time until users see old version |
| User awareness | 24 hours | Natural update cycle |

## Emergency Contacts

| Role | Escalation Time |
|------|-----------------|
| On-Call Engineer | Immediate |
| Team Lead (Isaiah Dupree) | < 30 minutes |
| Supabase Support | 1-2 hours |
| App Store Connect Support | Up to 24 hours |

## Validation After Rollback

After rollback, confirm:

1. ✓ Users can authenticate with v1.1.3
2. ✓ Subscriptions and RevenueCat working
3. ✓ No database corruption
4. ✓ Push notifications functional
5. ✓ Analytics tracking properly
6. ✓ Backend APIs responding
7. ✓ Supabase connection stable

## Incident Post-Mortem Questions

After rollback, investigate:

- What change caused the issue?
- Why wasn't it caught in testing?
- What environment (dev/staging/prod) showed the issue?
- Were analytics showing anomalies before issue reported?
- Which users were impacted and for how long?
- Should this code be kept reverted or is it fixable?

## Future Prevention

- [ ] Add this scenario to QA regression test suite
- [ ] Increase test coverage for modified code
- [ ] Add feature flag for risky features
- [ ] Implement staged rollout (10% → 25% → 50% → 100%)
- [ ] Set up automated monitoring alerts

---

**Last Updated:** April 18, 2026
**Prepared By:** Development Team
**Review Schedule:** Quarterly or after each major release
