/**
 * QUICKSTART Documentation Tests
 *
 * Validates that the QUICKSTART.md file exists and contains
 * all required sections for a 15-minute setup guide.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('QUICKSTART.md Documentation', () => {
  const quickstartPath = path.join(__dirname, '../../QUICKSTART.md');
  let quickstartContent: string;

  beforeAll(() => {
    // Read the QUICKSTART.md file
    quickstartContent = fs.readFileSync(quickstartPath, 'utf-8');
  });

  it('should exist in the ios-starter root directory', () => {
    expect(fs.existsSync(quickstartPath)).toBe(true);
  });

  it('should not be empty', () => {
    expect(quickstartContent.length).toBeGreaterThan(0);
  });

  describe('Required Sections', () => {
    it('should have a title heading', () => {
      expect(quickstartContent).toMatch(/^#\s+/m);
    });

    it('should include Prerequisites section', () => {
      expect(quickstartContent).toMatch(/##\s+Prerequisites/i);
    });

    it('should list Node.js requirement', () => {
      expect(quickstartContent.toLowerCase()).toContain('node');
    });

    it('should list npm or package manager requirement', () => {
      expect(quickstartContent.toLowerCase()).toMatch(/npm|yarn|bun/);
    });

    it('should mention Expo requirement', () => {
      expect(quickstartContent.toLowerCase()).toContain('expo');
    });

    it('should include Setup Steps section', () => {
      expect(quickstartContent).toMatch(/##\s+(Setup|Getting Started|Quick Start)/i);
    });

    it('should mention cloning or installation', () => {
      expect(quickstartContent.toLowerCase()).toMatch(/clone|install|download/);
    });

    it('should include Supabase setup instructions', () => {
      expect(quickstartContent.toLowerCase()).toContain('supabase');
    });

    it('should mention environment variables configuration', () => {
      expect(quickstartContent).toMatch(/\.env|environment|config/i);
    });

    it('should include running the app instructions', () => {
      expect(quickstartContent).toMatch(/npx expo start|expo start|npm (run )?start/);
    });

    it('should mention EXPO_PUBLIC_SUPABASE_URL variable', () => {
      expect(quickstartContent).toContain('EXPO_PUBLIC_SUPABASE_URL');
    });

    it('should mention EXPO_PUBLIC_SUPABASE_ANON_KEY variable', () => {
      expect(quickstartContent).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    });

    it('should include Next Steps section', () => {
      expect(quickstartContent).toMatch(/##\s+(Next Steps|What's Next|After Setup)/i);
    });

    it('should have helpful links or references', () => {
      // Check for markdown links or reference to other documentation
      expect(quickstartContent).toMatch(/\[.*\]\(.*\)|docs\/|CUSTOMIZATION/);
    });
  });

  describe('Content Quality', () => {
    it('should include code blocks for commands', () => {
      expect(quickstartContent).toMatch(/```/);
    });

    it('should be structured with multiple headings', () => {
      const headings = quickstartContent.match(/^##\s+/gm);
      expect(headings).not.toBeNull();
      expect(headings!.length).toBeGreaterThanOrEqual(3);
    });

    it('should mention the 15-minute setup time goal', () => {
      expect(quickstartContent).toMatch(/15[\s-]?min/i);
    });

    it('should reference the schema.sql file', () => {
      expect(quickstartContent).toContain('schema.sql');
    });
  });

  describe('Acceptance Criteria', () => {
    it('should provide a step-by-step guide', () => {
      // Check for numbered steps or clear sequential instructions
      expect(quickstartContent).toMatch(/\d+\.|Step \d+/);
    });

    it('should list all prerequisites clearly', () => {
      const lowerContent = quickstartContent.toLowerCase();
      expect(lowerContent).toContain('node');
      expect(lowerContent).toMatch(/npm|yarn|bun/);
      expect(lowerContent).toContain('expo');
    });
  });
});
