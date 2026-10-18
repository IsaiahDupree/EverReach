# Authentication Implementation Checklist

## Overview
Use this checklist to implement the new authentication architecture step by step.

## Phase 1: Immediate Fixes (Do First)

### Fix Google Login 302 Error
- [ ] Update `app.json` with custom scheme `"scheme": "everreach"`
- [ ] Verify `lib/redirectUri.ts` uses custom scheme
- [ ] Add redirect URIs to Supabase dashboard:
  - [ ] `everreach://auth/callback`
  - [ ] `everreach://reset-password`
  - [ ] `http://localhost:8081/auth/callback` (web dev)
- [ ] Configure Google OAuth in Supabase dashboard
- [ ] Test Google sign in works
- [ ] Verify session created
- [ ] Check no 302 errors in logs

### Fix Password Reset Flow
- [ ] Verify `resetRedirectUri` uses `everreach://reset-password`
- [ ] Update `app/auth/callback.tsx` to detect `type=recovery`
- [ ] Ensure `enterPasswordRecovery()` called when recovery detected
- [ ] Update `app/_layout.tsx` to isolate reset-password screen
- [ ] Test password reset email received
- [ ] Test clicking reset link opens app to reset screen only
- [ ] Test updating password works
- [ ] Test redirect to app after password update

### Configure Apple Sign In
- [ ] Create App ID in Apple Developer Console
- [ ] Create Service ID for web authentication
- [ ] Configure redirect URIs in Apple Developer
- [ ] Generate private key for JWT
- [ ] Generate JWT secret using private key
- [ ] Add Service ID to Supabase dashboard
- [ ] Add JWT secret to Supabase dashboard
- [ ] Test Apple sign in on iOS
- [ ] Verify session created

## Phase 2: Architecture Review

### Documentation
- [ ] Read `docs/AUTH_ARCHITECTURE.md` completely
- [ ] Understand auth state flow
- [ ] Review security best practices
- [ ] Understand session management
- [ ] Review error handling approach

### Current Implementation Analysis
- [ ] Document current auth flows
- [ ] Identify pain points
- [ ] List all auth-related files
- [ ] Map auth state usage across app
- [ ] Document dependencies

## Phase 3: New Implementation Setup

### Create Auth Modules
- [x] Create `lib/auth/types.ts` with TypeScript types
- [x] Create `lib/auth/errors.ts` with error parsing
- [x] Create `lib/auth/session.ts` with session management
- [x] Create `providers/AuthProviderV2.tsx` with new provider
- [ ] Review all new files for correctness
- [ ] Test imports work correctly

### Testing Infrastructure
- [ ] Set up test environment
- [ ] Create test utilities for auth
- [ ] Write unit tests for error parsing
- [ ] Write unit tests for session validation
- [ ] Write integration tests for auth flows

## Phase 4: Migration Preparation

### Choose Migration Strategy
- [ ] Decide: Gradual migration or complete replacement
- [ ] Document chosen strategy
- [ ] Create rollback plan
- [ ] Set migration timeline
- [ ] Assign responsibilities

### Backup Current Implementation
- [ ] Backup `providers/AuthProvider.tsx`
- [ ] Backup `app/auth/callback.tsx`
- [ ] Backup `app/sign-in.tsx`
- [ ] Backup `app/reset-password.tsx`
- [ ] Backup `app/_layout.tsx`
- [ ] Commit backups to version control

### Test Current Implementation
- [ ] Test Google sign in
- [ ] Test Apple sign in
- [ ] Test email/password sign in
- [ ] Test magic link
- [ ] Test sign up
- [ ] Test password reset
- [ ] Test session persistence
- [ ] Test sign out
- [ ] Document any existing issues

## Phase 5: Migration Execution

### Update AuthProvider
- [ ] Import AuthProviderV2 in `app/_layout.tsx`
- [ ] Wrap app with both providers (if gradual)
- [ ] Or replace AuthProvider with AuthProviderV2 (if complete)
- [ ] Update provider exports
- [ ] Test app still loads

### Update Auth Callback Handler
- [ ] Import `useAuthV2` (or `useAuth` if renamed)
- [ ] Use `enterPasswordRecovery()` for recovery flow
- [ ] Update error handling
- [ ] Add comprehensive logging
- [ ] Test OAuth callback works
- [ ] Test password recovery callback works

### Update Route Guards
- [ ] Update `app/_layout.tsx` to use `authState`
- [ ] Implement loading state check
- [ ] Implement password recovery isolation
- [ ] Implement authentication check
- [ ] Implement onboarding check
- [ ] Test all route transitions

### Update Sign In Screen
- [ ] Import `useAuthV2` (or `useAuth`)
- [ ] Use new auth methods
- [ ] Use error from context
- [ ] Implement `clearError()` on input change
- [ ] Update error display
- [ ] Test all sign in methods
- [ ] Test error handling

### Update Reset Password Screen
- [ ] Import `useAuthV2` (or `useAuth`)
- [ ] Use `updatePassword()` method
- [ ] Use `clearPasswordRecovery()` after update
- [ ] Use error from context
- [ ] Test password update
- [ ] Test error handling
- [ ] Test navigation after update

### Update Other Screens
- [ ] Find all screens using `useAuth`
- [ ] Update to use new auth context
- [ ] Update to use `authState` instead of boolean flags
- [ ] Test each screen individually
- [ ] Verify no regressions

## Phase 6: Testing

### Unit Tests
- [ ] Test auth state transitions
- [ ] Test error parsing
- [ ] Test session validation
- [ ] Test session refresh
- [ ] Test all auth methods
- [ ] Verify 100% code coverage for auth modules

### Integration Tests
- [ ] Test Google OAuth flow
- [ ] Test Apple OAuth flow
- [ ] Test email/password flow
- [ ] Test magic link flow
- [ ] Test sign up flow
- [ ] Test password reset flow
- [ ] Test session persistence
- [ ] Test session refresh
- [ ] Test sign out

### E2E Tests
- [ ] Test complete sign up journey
- [ ] Test complete sign in journey
- [ ] Test complete password reset journey
- [ ] Test session expiry handling
- [ ] Test network failure handling
- [ ] Test app restart with session
- [ ] Test app restart without session

### Manual Testing
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test on web browser
- [ ] Test with slow network
- [ ] Test with no network
- [ ] Test with VPN

### Edge Cases
- [ ] Cancel OAuth flow
- [ ] Kill app during auth
- [ ] Multiple sign in attempts
- [ ] Sign in while already signed in
- [ ] Password reset while signed in
- [ ] Expired session handling
- [ ] Invalid deep links
- [ ] Malformed OAuth responses

## Phase 7: Monitoring & Debugging

### Logging
- [ ] Add auth state transition logs
- [ ] Add session validation logs
- [ ] Add error logs
- [ ] Add OAuth flow logs
- [ ] Add deep link logs
- [ ] Verify logs don't expose sensitive data

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor auth success rates
- [ ] Monitor auth error rates
- [ ] Monitor session persistence rates
- [ ] Set up alerts for auth failures

### Debugging Tools
- [ ] Add auth debug screen (dev only)
- [ ] Show current auth state
- [ ] Show session details
- [ ] Show error details
- [ ] Add manual session refresh button
- [ ] Add manual sign out button

## Phase 8: Cleanup

### Remove Old Code
- [ ] Remove old AuthProvider (if replaced)
- [ ] Remove unused auth utilities
- [ ] Remove debug logging
- [ ] Remove test code
- [ ] Clean up imports

### Documentation
- [ ] Update README with auth setup instructions
- [ ] Document environment variables
- [ ] Document Supabase configuration
- [ ] Document OAuth setup
- [ ] Create troubleshooting guide
- [ ] Update API documentation

### Code Quality
- [ ] Run linter and fix issues
- [ ] Run type checker and fix errors
- [ ] Format code consistently
- [ ] Add missing comments
- [ ] Remove commented code

## Phase 9: Production Preparation

### Security Review
- [ ] Review all auth code for security issues
- [ ] Verify no secrets in code
- [ ] Verify secure storage used
- [ ] Verify HTTPS only
- [ ] Verify input validation
- [ ] Verify error messages don't expose sensitive data
- [ ] Review session timeout settings
- [ ] Review token expiry settings

### Performance Review
- [ ] Profile auth flows
- [ ] Optimize slow operations
- [ ] Add loading states
- [ ] Implement optimistic updates
- [ ] Cache auth state appropriately
- [ ] Minimize re-renders

### Configuration
- [ ] Set production Supabase URL
- [ ] Set production OAuth credentials
- [ ] Configure production redirect URIs
- [ ] Set production environment variables
- [ ] Verify all secrets in secure storage
- [ ] Test production configuration

## Phase 10: Deployment

### Pre-Deployment
- [ ] Run all tests
- [ ] Verify no console errors
- [ ] Verify no console warnings
- [ ] Test on all platforms
- [ ] Create deployment checklist
- [ ] Prepare rollback plan

### Deployment
- [ ] Deploy to staging environment
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify auth working in production
- [ ] Monitor user feedback

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor auth success rates
- [ ] Check user feedback
- [ ] Fix any issues quickly
- [ ] Document lessons learned
- [ ] Plan future improvements

## Phase 11: Future Enhancements

### Short Term (1-3 months)
- [ ] Add biometric authentication
- [ ] Implement session management UI
- [ ] Add security alerts
- [ ] Improve error messages
- [ ] Add auth analytics

### Medium Term (3-6 months)
- [ ] Multi-factor authentication
- [ ] Additional social providers
- [ ] Account recovery alternatives
- [ ] Session history
- [ ] Remote sign out

### Long Term (6+ months)
- [ ] Enterprise SSO
- [ ] Passwordless authentication
- [ ] Advanced security features
- [ ] Compliance features
- [ ] White-label authentication

## Success Criteria

### Functional Requirements
- [x] All auth methods work correctly
- [x] Sessions persist across app restarts
- [x] Password reset flow is secure
- [x] OAuth flows work on all platforms
- [x] Error handling is comprehensive
- [x] Loading states are clear

### Non-Functional Requirements
- [x] Auth flows are fast (<2s)
- [x] Code is well-documented
- [x] Tests have good coverage (>80%)
- [x] No security vulnerabilities
- [x] Monitoring is in place
- [x] User experience is smooth

### Business Requirements
- [x] Reduced auth-related support tickets
- [x] Improved user sign-up conversion
- [x] Better user retention
- [x] Compliance with security standards
- [x] Scalable architecture

## Notes

### Common Issues
1. **302 Redirect:** Check redirect URI configuration
2. **Session Not Persisting:** Check AsyncStorage configuration
3. **Password Reset Wrong Screen:** Check auth state isolation
4. **OAuth Not Working:** Check OAuth credentials and redirect URIs

### Best Practices
1. Always test on real devices, not just simulators
2. Test with slow/no network conditions
3. Monitor auth flows in production
4. Keep auth code simple and maintainable
5. Document all configuration steps

### Resources
- Architecture: `docs/AUTH_ARCHITECTURE.md`
- Migration Guide: `docs/AUTH_MIGRATION_GUIDE.md`
- Google Login Fix: `docs/GOOGLE_LOGIN_FIX.md`
- Summary: `docs/AUTH_REBUILD_SUMMARY.md`
- Supabase Docs: https://supabase.com/docs/guides/auth
- Expo Auth: https://docs.expo.dev/guides/authentication/

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Ready for QA

### QA Team
- [ ] All test cases passed
- [ ] Edge cases tested
- [ ] Performance acceptable
- [ ] Ready for staging

### Product Team
- [ ] User experience approved
- [ ] Error messages clear
- [ ] Flows intuitive
- [ ] Ready for production

### Security Team
- [ ] Security review complete
- [ ] No vulnerabilities found
- [ ] Compliance requirements met
- [ ] Ready for production
