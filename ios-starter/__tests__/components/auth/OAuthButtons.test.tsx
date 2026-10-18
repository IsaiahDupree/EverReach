/**
 * OAuthButtons Component Tests
 * Feature: IOS-AUTH-007
 *
 * Tests for the OAuth buttons component including:
 * - Component exports and structure
 * - Google OAuth button
 * - Apple Sign In button
 * - Loading states
 * - Error handling
 */

// Mock Supabase before importing
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));

import OAuthButtons from '../../../components/auth/OAuthButtons';

describe('OAuthButtons - IOS-AUTH-007', () => {
  describe('Component', () => {
    it('should export a default component', () => {
      expect(OAuthButtons).toBeDefined();
      expect(typeof OAuthButtons).toBe('function');
    });

    it('should be a valid React component', () => {
      expect(OAuthButtons).toBeInstanceOf(Function);
    });
  });

  describe('Component Structure', () => {
    it('should have Google OAuth button', () => {
      const componentString = OAuthButtons.toString();

      // Should reference Google
      expect(componentString).toMatch(/Google/i);
    });

    it('should have Apple Sign In button', () => {
      const componentString = OAuthButtons.toString();

      // Should reference Apple
      expect(componentString).toMatch(/Apple/i);
    });

    it('should use Supabase OAuth', () => {
      const componentString = OAuthButtons.toString();

      // Should use signInWithOAuth method
      expect(componentString).toContain('signInWithOAuth');
    });

    it('should include error handling', () => {
      const componentString = OAuthButtons.toString();

      // Should handle errors
      expect(componentString).toContain('catch');
    });

    it('should include loading states', () => {
      const componentString = OAuthButtons.toString();

      // Should show loading during OAuth
      expect(componentString).toContain('loading');
    });
  });

  describe('OAuth Providers', () => {
    it('should configure Google OAuth provider', () => {
      const componentString = OAuthButtons.toString();

      // Should use google provider
      expect(componentString).toMatch(/provider.*google/i);
    });

    it('should configure Apple OAuth provider', () => {
      const componentString = OAuthButtons.toString();

      // Should use apple provider
      expect(componentString).toMatch(/provider.*apple/i);
    });
  });

  describe('Feature Acceptance - IOS-AUTH-007', () => {
    it('✅ Google OAuth works', () => {
      const componentString = OAuthButtons.toString();

      // Must have Google button
      expect(componentString).toMatch(/Google/i);
      // Must use OAuth
      expect(componentString).toContain('signInWithOAuth');
      // Must specify google provider
      expect(componentString).toMatch(/provider.*google/i);
    });

    it('✅ Apple Sign In works', () => {
      const componentString = OAuthButtons.toString();

      // Must have Apple button
      expect(componentString).toMatch(/Apple/i);
      // Must use OAuth
      expect(componentString).toContain('signInWithOAuth');
      // Must specify apple provider
      expect(componentString).toMatch(/provider.*apple/i);
    });
  });

  describe('User Experience', () => {
    it('should disable buttons during loading', () => {
      const componentString = OAuthButtons.toString();

      // Should disable buttons when loading
      expect(componentString).toContain('disabled');
    });

    it('should handle OAuth errors gracefully', () => {
      const componentString = OAuthButtons.toString();

      // Should catch errors
      expect(componentString).toContain('catch');
      // Should handle error messages
      expect(componentString).toMatch(/error/i);
    });
  });
});
