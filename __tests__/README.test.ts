/**
 * Test suite for root README.md
 * Feature: HO-README-004 - Root Monorepo README
 */

import fs from 'fs';
import path from 'path';

describe('Root README.md', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readmeContent: string;

  beforeAll(() => {
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  it('should exist', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  describe('Required sections', () => {
    it('should have a title', () => {
      expect(readmeContent).toMatch(/^#\s+EverReach App Kit/m);
    });

    it('should have an overview section', () => {
      expect(readmeContent).toMatch(/##\s+Overview/i);
    });

    it('should describe the monorepo structure', () => {
      expect(readmeContent).toMatch(/ios-starter/i);
      expect(readmeContent).toMatch(/backend-kit/i);
      expect(readmeContent).toMatch(/web-kit/i);
    });

    it('should have a quick navigation section', () => {
      expect(readmeContent).toMatch(/##\s+(Quick Navigation|Starter Kits)/i);
    });

    it('should have links to all three starter kits', () => {
      // Check for links to subdirectory READMEs
      expect(readmeContent).toMatch(/ios-starter\/README\.md/i);
      expect(readmeContent).toMatch(/backend-kit\/README\.md/i);
      expect(readmeContent).toMatch(/web-kit\/README\.md/i);
    });

    it('should have a getting started section', () => {
      expect(readmeContent).toMatch(/##\s+(Getting Started|Quick Start)/i);
    });

    it('should mention prerequisites', () => {
      expect(readmeContent).toMatch(/prerequisite/i);
      expect(readmeContent).toMatch(/Node\.js/i);
    });

    it('should include architecture information', () => {
      expect(readmeContent).toMatch(/(architecture|stack|technology)/i);
    });

    it('should have links to PRDs', () => {
      expect(readmeContent).toMatch(/PRD.*\.md/i);
    });
  });

  describe('Content quality', () => {
    it('should not be too short (at least 1000 characters)', () => {
      expect(readmeContent.length).toBeGreaterThan(1000);
    });

    it('should include all three kit names', () => {
      const lowerContent = readmeContent.toLowerCase();
      expect(lowerContent).toContain('ios');
      expect(lowerContent).toContain('backend');
      expect(lowerContent).toContain('web');
    });

    it('should mention Supabase', () => {
      expect(readmeContent).toMatch(/Supabase/i);
    });

    it('should mention key technologies', () => {
      const lowerContent = readmeContent.toLowerCase();
      expect(lowerContent).toMatch(/next\.js|nextjs/i);
      expect(lowerContent).toMatch(/react native|expo/i);
    });
  });

  describe('Navigation links', () => {
    it('should provide clear navigation to sub-READMEs', () => {
      // Ensure there are markdown links to the subdirectories
      expect(readmeContent).toMatch(/\[.*\]\(.*ios-starter.*README\.md\)/i);
      expect(readmeContent).toMatch(/\[.*\]\(.*backend-kit.*README\.md\)/i);
      expect(readmeContent).toMatch(/\[.*\]\(.*web-kit.*README\.md\)/i);
    });

    it('should link to developer handoff guide', () => {
      expect(readmeContent).toMatch(/DEVELOPER_HANDOFF\.md/i);
    });
  });
});
