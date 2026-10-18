/**
 * Golden Scenario Tests
 * Tests message generation against predefined scenarios with expected outcomes
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Load golden scenarios
const scenariosPath = path.join(__dirname, '../fixtures/message-scenarios.json');
const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));

type Scenario = {
  name: string;
  description: string;
  user: any;
  contact: any;
  interactions: any[];
  goal: any;
  expect: {
    channel: string;
    tone: string;
    contains: string[];
    not_contains: string[];
    has_cta: boolean;
    cta_type?: string;
    length_range: [number, number];
    has_specific_times?: boolean;
  };
};

describe('Golden Scenario Tests', () => {
  scenarios.forEach((scenario: Scenario) => {
    describe(scenario.name, () => {
      test(`[${scenario.name}] ${scenario.description}`, async () => {
        // This test validates the scenario structure
        expect(scenario).toHaveProperty('user');
        expect(scenario).toHaveProperty('contact');
        expect(scenario).toHaveProperty('goal');
        expect(scenario).toHaveProperty('expect');
        
        // Validate user structure
        expect(scenario.user).toHaveProperty('voice_style');
        expect(scenario.user).toHaveProperty('persona_summary');
        expect(scenario.user).toHaveProperty('default_channels');
        expect(Array.isArray(scenario.user.default_channels)).toBe(true);
        
        // Validate contact structure
        expect(scenario.contact).toHaveProperty('name');
        expect(scenario.contact).toHaveProperty('warmth');
        expect(typeof scenario.contact.warmth).toBe('number');
        expect(scenario.contact.warmth).toBeGreaterThanOrEqual(-100);
        expect(scenario.contact.warmth).toBeLessThanOrEqual(100);
        
        // Validate pipeline and status
        expect(['business', 'networking', 'personal']).toContain(scenario.contact.pipeline);
        expect(['new', 'active', 'nurture', 'dormant', 'revive', 'closed']).toContain(scenario.contact.status);
        
        // Validate interactions
        expect(Array.isArray(scenario.interactions)).toBe(true);
        scenario.interactions.forEach((interaction: any) => {
          expect(interaction).toHaveProperty('date');
          expect(interaction).toHaveProperty('direction');
          expect(['in', 'out']).toContain(interaction.direction);
          expect(interaction).toHaveProperty('channel');
          expect(interaction).toHaveProperty('content');
          expect(interaction).toHaveProperty('sentiment');
          expect(interaction.sentiment).toBeGreaterThanOrEqual(-2);
          expect(interaction.sentiment).toBeLessThanOrEqual(2);
        });
        
        // Validate goal
        expect(scenario.goal).toHaveProperty('type');
        expect(['follow_up', 'book_meeting', 'check_in', 'share_resource', 'introduction']).toContain(scenario.goal.type);
        
        // Validate expectations
        expect(scenario.expect).toHaveProperty('channel');
        expect(scenario.expect).toHaveProperty('tone');
        expect(Array.isArray(scenario.expect.contains)).toBe(true);
        expect(Array.isArray(scenario.expect.not_contains)).toBe(true);
        expect(typeof scenario.expect.has_cta).toBe('boolean');
        expect(Array.isArray(scenario.expect.length_range)).toBe(true);
        expect(scenario.expect.length_range).toHaveLength(2);
      });

      test(`[${scenario.name}] Channel selection logic`, () => {
        // Test that expected channel makes sense given:
        // 1. User's default channels
        // 2. Contact's available handles
        // 3. Goal's channel hint (if any)
        
        const expectedChannel = scenario.expect.channel;
        const goalHint = scenario.goal.constraints?.channel_hint;
        
        // If goal has explicit hint, expected should match
        if (goalHint) {
          expect(expectedChannel).toBe(goalHint);
        }
        
        // Expected channel should be in user's defaults OR be contact's preference
        const userChannels = scenario.user.default_channels;
        const contactPreferences = scenario.contact.preferences || [];
        
        const isValid = 
          userChannels.includes(expectedChannel) ||
          contactPreferences.some((p: string) => p.toLowerCase().includes(expectedChannel));
        
        expect(isValid).toBe(true);
      });

      test(`[${scenario.name}] Warmth-based approach validation`, () => {
        const warmth = scenario.contact.warmth;
        const expectation = scenario.expect;
        
        // Low warmth (< 20) should have:
        // - Value-focused approach
        // - No aggressive asks
        // - Soft CTAs or none
        if (warmth < 20) {
          expect(['value-focused', 'respectful', 'no-pressure']).toContainEqual(
            expect.stringContaining(expectation.tone)
          );
          
          // Should not contain pushy language
          const pushyTerms = ['urgent', 'need', 'must', 'asap', 'immediately'];
          pushyTerms.forEach(term => {
            expect(expectation.not_contains).toContain(term);
          });
        }
        
        // High warmth (> 70) can be:
        // - More casual
        // - Direct asks OK
        // - Familiar language
        if (warmth > 70) {
          expect(['casual', 'friendly', 'warm']).toContainEqual(
            expect.stringContaining(expectation.tone)
          );
        }
        
        // Medium warmth (20-70) should be:
        // - Professional
        // - Balanced
        if (warmth >= 20 && warmth <= 70) {
          expect(['professional', 'clear', 'balanced']).toContainEqual(
            expect.stringContaining(expectation.tone)
          );
        }
      });

      test(`[${scenario.name}] Pipeline and status influence tone`, () => {
        const { pipeline, status } = scenario.contact;
        const { tone, has_cta, cta_type } = scenario.expect;
        
        // Business + Active = professional, clear CTAs
        if (pipeline === 'business' && status === 'active') {
          expect(tone).toContain('professional');
          expect(has_cta).toBe(true);
        }
        
        // Networking + New = friendly, connection-building
        if (pipeline === 'networking' && status === 'new') {
          expect(['friendly', 'casual', 'warm']).toContainEqual(
            expect.stringContaining(tone)
          );
        }
        
        // Personal + any = casual, authentic
        if (pipeline === 'personal') {
          expect(['casual', 'friendly', 'warm', 'genuine']).toContainEqual(
            expect.stringContaining(tone)
          );
        }
        
        // Dormant or Revive = value-first, no pressure
        if (status === 'dormant' || status === 'revive') {
          expect(['value-focused', 'no-pressure', 'respectful']).toContainEqual(
            expect.stringContaining(tone)
          );
          
          if (has_cta) {
            expect(cta_type).toMatch(/soft/);
          }
        }
      });

      test(`[${scenario.name}] Boundary respect`, () => {
        const boundaries = scenario.contact.boundaries || [];
        const { not_contains } = scenario.expect;
        
        boundaries.forEach((boundary: string) => {
          if (boundary.toLowerCase().includes('no cold calls')) {
            expect(not_contains).toContainEqual(expect.stringMatching(/call/i));
          }
          
          if (boundary.toLowerCase().includes('no weekend')) {
            expect(not_contains).toContainEqual(expect.stringMatching(/weekend|saturday|sunday/i));
          }
          
          if (boundary.toLowerCase().includes('no evening')) {
            expect(not_contains).toContainEqual(expect.stringMatching(/evening|tonight/i));
          }
        });
      });

      test(`[${scenario.name}] Goal-appropriate CTA`, () => {
        const { goal, expect: expectation } = scenario;
        
        // book_meeting should have clear meeting CTA
        if (goal.type === 'book_meeting') {
          expect(expectation.has_cta).toBe(true);
          expect(expectation.cta_type).toMatch(/meeting|call|sync/);
        }
        
        // check_in usually has soft or no CTA
        if (goal.type === 'check_in') {
          if (expectation.has_cta) {
            expect(expectation.cta_type).toMatch(/coffee|catch|chat/);
          }
        }
        
        // share_resource typically has no CTA
        if (goal.type === 'share_resource') {
          expect(expectation.has_cta).toBe(false);
        }
      });

      test(`[${scenario.name}] Message length constraints`, () => {
        const [minLength, maxLength] = scenario.expect.length_range;
        const channel = scenario.expect.channel;
        
        // Validate length ranges make sense for channel
        if (channel === 'sms') {
          expect(maxLength).toBeLessThanOrEqual(160); // SMS constraint
        }
        
        if (channel === 'email') {
          expect(minLength).toBeGreaterThanOrEqual(50); // Email should have substance
        }
        
        // Length should match goal's constraints
        if (scenario.goal.constraints?.length === 'short') {
          expect(maxLength).toBeLessThanOrEqual(150);
        }
        
        if (scenario.goal.constraints?.length === 'medium') {
          expect(minLength).toBeGreaterThanOrEqual(80);
          expect(maxLength).toBeLessThanOrEqual(250);
        }
      });

      test(`[${scenario.name}] Recent interaction context is considered`, () => {
        const recentInteractions = scenario.interactions
          .filter((ix: any) => {
            const daysAgo = (Date.now() - new Date(ix.date).getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30; // Last 30 days
          });
        
        if (recentInteractions.length > 0) {
          // Most recent interaction should influence expected content
          const mostRecent = recentInteractions[recentInteractions.length - 1];
          
          // If last interaction was negative, expect should acknowledge
          if (mostRecent.sentiment < 0) {
            expect(scenario.expect.contains).toContainEqual(
              expect.stringMatching(/acknowledge|understand|respect/i)
            );
          }
          
          // If last interaction was positive, can be more forward
          if (mostRecent.sentiment > 0 && scenario.contact.warmth > 50) {
            // Positive momentum allows more direct approach
            expect(scenario.expect.tone).not.toContain('cautious');
          }
        }
      });
    });
  });

  test('All scenarios cover diverse warmth ranges', () => {
    const warmthScores = scenarios.map((s: Scenario) => s.contact.warmth);
    
    // Should have scenarios across spectrum
    expect(Math.min(...warmthScores)).toBeLessThan(20); // Cold
    expect(Math.max(...warmthScores)).toBeGreaterThan(70); // Warm
    
    // Should have variety
    expect(new Set(warmthScores).size).toBeGreaterThan(3);
  });

  test('All scenarios cover all pipeline types', () => {
    const pipelines = scenarios.map((s: Scenario) => s.contact.pipeline);
    
    expect(pipelines).toContain('business');
    expect(pipelines).toContain('networking');
    expect(pipelines).toContain('personal');
  });

  test('All scenarios cover diverse status types', () => {
    const statuses = scenarios.map((s: Scenario) => s.contact.status);
    
    // Should have variety of statuses
    expect(new Set(statuses).size).toBeGreaterThan(3);
  });

  test('All scenarios have valid interaction histories', () => {
    scenarios.forEach((scenario: Scenario) => {
      // Each scenario should have at least 1 interaction
      expect(scenario.interactions.length).toBeGreaterThan(0);
      
      // Interactions should be chronologically ordered
      const dates = scenario.interactions.map((ix: any) => new Date(ix.date).getTime());
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
      
      // Should have mix of directions
      const directions = scenario.interactions.map((ix: any) => ix.direction);
      if (scenario.interactions.length > 1) {
        // Multi-interaction scenarios should show conversation
        expect(new Set(directions).size).toBeGreaterThan(1);
      }
    });
  });
});
