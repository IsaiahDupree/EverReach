/**
 * Tests for Help Content
 * Feature: HO-HELP-002
 *
 * Acceptance Criteria:
 * - Warmth score explained
 * - Bands explained
 * - Pipeline explained
 */

import { describe, it, expect } from '@jest/globals';

describe('Help Content (HO-HELP-002)', () => {
  describe('Warmth Score Help', () => {
    it('should export warmth score help content', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT).toBeDefined();
      expect(HELP_CONTENT.warmthScore).toBeDefined();
    });

    it('should explain what warmth score is', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthScore.title).toBe('Warmth Score');
      expect(HELP_CONTENT.warmthScore.description).toBeDefined();
      expect(HELP_CONTENT.warmthScore.description.length).toBeGreaterThan(20);
      expect(HELP_CONTENT.warmthScore.description).toContain('relationship');
    });

    it('should include warmth score details', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthScore.details).toBeDefined();
      expect(Array.isArray(HELP_CONTENT.warmthScore.details)).toBe(true);
      expect(HELP_CONTENT.warmthScore.details.length).toBeGreaterThan(0);
    });

    it('should include warmth score examples', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthScore.examples).toBeDefined();
      expect(Array.isArray(HELP_CONTENT.warmthScore.examples)).toBe(true);
      expect(HELP_CONTENT.warmthScore.examples.length).toBeGreaterThan(0);
    });
  });

  describe('Warmth Bands Help', () => {
    it('should export warmth bands help content', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthBands).toBeDefined();
    });

    it('should explain what warmth bands are', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthBands.title).toBe('Warmth Bands');
      expect(HELP_CONTENT.warmthBands.description).toBeDefined();
      expect(HELP_CONTENT.warmthBands.description.length).toBeGreaterThan(20);
    });

    it('should define all warmth band levels', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.warmthBands.bands).toBeDefined();
      expect(Array.isArray(HELP_CONTENT.warmthBands.bands)).toBe(true);

      // Should have multiple bands (cold, warm, hot, etc.)
      expect(HELP_CONTENT.warmthBands.bands.length).toBeGreaterThanOrEqual(3);

      // Each band should have required fields
      HELP_CONTENT.warmthBands.bands.forEach((band: any) => {
        expect(band.level).toBeDefined();
        expect(band.name).toBeDefined();
        expect(band.description).toBeDefined();
        expect(band.scoreRange).toBeDefined();
      });
    });
  });

  describe('Contact Pipeline Help', () => {
    it('should export pipeline help content', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.pipeline).toBeDefined();
    });

    it('should explain what the contact pipeline is', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.pipeline.title).toBe('Contact Pipeline');
      expect(HELP_CONTENT.pipeline.description).toBeDefined();
      expect(HELP_CONTENT.pipeline.description.length).toBeGreaterThan(20);
      expect(HELP_CONTENT.pipeline.description).toContain('contact');
    });

    it('should define pipeline stages', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.pipeline.stages).toBeDefined();
      expect(Array.isArray(HELP_CONTENT.pipeline.stages)).toBe(true);

      // Should have multiple stages
      expect(HELP_CONTENT.pipeline.stages.length).toBeGreaterThanOrEqual(3);

      // Each stage should have required fields
      HELP_CONTENT.pipeline.stages.forEach((stage: any) => {
        expect(stage.name).toBeDefined();
        expect(stage.description).toBeDefined();
        expect(stage.action).toBeDefined();
      });
    });

    it('should include pipeline best practices', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      expect(HELP_CONTENT.pipeline.bestPractices).toBeDefined();
      expect(Array.isArray(HELP_CONTENT.pipeline.bestPractices)).toBe(true);
      expect(HELP_CONTENT.pipeline.bestPractices.length).toBeGreaterThan(0);
    });
  });

  describe('Content Structure', () => {
    it('should have consistent structure across all help topics', () => {
      const { HELP_CONTENT } = require('../../lib/help-content');

      const topics = [HELP_CONTENT.warmthScore, HELP_CONTENT.warmthBands, HELP_CONTENT.pipeline];

      topics.forEach((topic: any) => {
        expect(topic.title).toBeDefined();
        expect(typeof topic.title).toBe('string');
        expect(topic.description).toBeDefined();
        expect(typeof topic.description).toBe('string');
      });
    });

    it('should export getHelpContent utility function', () => {
      const { getHelpContent } = require('../../lib/help-content');

      expect(getHelpContent).toBeDefined();
      expect(typeof getHelpContent).toBe('function');
    });

    it('should retrieve help content by key', () => {
      const { getHelpContent } = require('../../lib/help-content');

      const warmthScoreHelp = getHelpContent('warmthScore');
      expect(warmthScoreHelp).toBeDefined();
      expect(warmthScoreHelp.title).toBe('Warmth Score');

      const bandsHelp = getHelpContent('warmthBands');
      expect(bandsHelp).toBeDefined();
      expect(bandsHelp.title).toBe('Warmth Bands');

      const pipelineHelp = getHelpContent('pipeline');
      expect(pipelineHelp).toBeDefined();
      expect(pipelineHelp.title).toBe('Contact Pipeline');
    });

    it('should return null for invalid keys', () => {
      const { getHelpContent } = require('../../lib/help-content');

      const invalidHelp = getHelpContent('nonexistent');
      expect(invalidHelp).toBeNull();
    });
  });
});
