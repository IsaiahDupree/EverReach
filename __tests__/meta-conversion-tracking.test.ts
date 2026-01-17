/**
 * Meta Conversion Tracking Tests
 * 
 * Tests that CompleteRegistration and Activate events are properly configured.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Meta Conversion Tracking Implementation', () => {
  describe('CompleteRegistration Event', () => {
    let authCallbackContent: string;

    beforeAll(() => {
      authCallbackContent = readFileSync(
        join(__dirname, '../app/auth/callback.tsx'),
        'utf-8'
      );
    });

    it('should import trackEvent from metaPixel', () => {
      expect(authCallbackContent).toContain("import { trackEvent } from '@/lib/metaPixel'");
    });

    it('should have dedupe key for CompleteRegistration', () => {
      expect(authCallbackContent).toContain('COMPLETE_REGISTRATION_FIRED_KEY');
    });

    it('should check if user is new (created within 10 min)', () => {
      expect(authCallbackContent).toContain('isNewUser');
      expect(authCallbackContent).toContain('10 * 60 * 1000');
    });

    it('should fire CompleteRegistration event with correct params', () => {
      expect(authCallbackContent).toContain("trackEvent('CompleteRegistration'");
      expect(authCallbackContent).toContain("content_name: 'Account Verified'");
      expect(authCallbackContent).toContain("status: 'complete'");
    });

    it('should store userId after firing to prevent duplicate events', () => {
      expect(authCallbackContent).toContain('AsyncStorage.setItem(COMPLETE_REGISTRATION_FIRED_KEY, userId)');
    });

    it('should check alreadyFired before tracking', () => {
      expect(authCallbackContent).toContain('!alreadyFired');
    });
  });

  describe('Activate Event', () => {
    let onboardingContent: string;

    beforeAll(() => {
      onboardingContent = readFileSync(
        join(__dirname, '../app/onboarding.tsx'),
        'utf-8'
      );
    });

    it('should import trackEvent from metaPixel', () => {
      expect(onboardingContent).toContain("import { trackEvent } from '@/lib/metaPixel'");
    });

    it('should fire Activate event in handleComplete', () => {
      expect(onboardingContent).toContain("trackEvent('Activate'");
    });

    it('should have correct activation_type param', () => {
      expect(onboardingContent).toContain("activation_type: 'onboarding_completed'");
    });

    it('should have content_name for Onboarding Completed', () => {
      expect(onboardingContent).toContain("content_name: 'Onboarding Completed'");
    });

    it('should only fire Activate once (in handleComplete, not handleSkip)', () => {
      // Count occurrences of Activate event
      const activateMatches = onboardingContent.match(/trackEvent\('Activate'/g);
      expect(activateMatches).toHaveLength(1);
    });
  });

  describe('Event Deduplication', () => {
    let authCallbackContent: string;

    beforeAll(() => {
      authCallbackContent = readFileSync(
        join(__dirname, '../app/auth/callback.tsx'),
        'utf-8'
      );
    });

    it('should use AsyncStorage for deduplication', () => {
      expect(authCallbackContent).toContain('AsyncStorage');
    });

    it('should check existing flag before firing', () => {
      expect(authCallbackContent).toContain('alreadyFired');
      expect(authCallbackContent).toContain('AsyncStorage.getItem');
    });

    it('should save flag after firing', () => {
      expect(authCallbackContent).toContain('AsyncStorage.setItem');
    });
  });

  describe('Meta Pixel Integration', () => {
    let metaPixelContent: string;

    beforeAll(() => {
      metaPixelContent = readFileSync(
        join(__dirname, '../lib/metaPixel.ts'),
        'utf-8'
      );
    });

    it('should export trackEvent function', () => {
      expect(metaPixelContent).toMatch(/export\s+(async\s+)?function\s+trackEvent/);
    });

    it('should have PIXEL_ID configured', () => {
      expect(metaPixelContent).toMatch(/PIXEL_ID|pixelId|pixel_id/i);
    });
  });
});

describe('Conversion Mapping Documentation', () => {
  let docContent: string;

  beforeAll(() => {
    docContent = readFileSync(
      join(__dirname, '../docs/META_ADS_CONVERSION_MAPPING.md'),
      'utf-8'
    );
  });

  it('should document CompleteRegistration fires after email verification', () => {
    expect(docContent).toContain('email verification');
    expect(docContent).toContain('NOT on initial signup');
  });

  it('should document Activate as single event', () => {
    expect(docContent).toContain('Single Event');
    expect(docContent).toContain('ONE event');
  });

  it('should not use URL rules for CompleteRegistration', () => {
    expect(docContent).toContain('Event: CompleteRegistration');
    expect(docContent).toContain('no URL rule');
  });

  it('should recommend /thank-you-qualified path instead of querystring', () => {
    expect(docContent).toContain('/thank-you-qualified');
  });

  it('should document AEM priority order', () => {
    expect(docContent).toContain('AEM');
    expect(docContent).toContain('CompleteRegistration');
    expect(docContent).toContain('Activate');
  });
});
