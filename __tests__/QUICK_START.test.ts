import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('QUICK_START.md', () => {
  const quickStartPath = path.join(__dirname, '..', 'QUICK_START.md');

  it('should exist', () => {
    expect(fs.existsSync(quickStartPath)).toBe(true);
  });

  describe('content requirements', () => {
    let content: string;

    beforeAll(() => {
      if (fs.existsSync(quickStartPath)) {
        content = fs.readFileSync(quickStartPath, 'utf-8');
      }
    });

    it('should have prerequisites section', () => {
      expect(content).toMatch(/##?\s+Prerequisites/i);
    });

    it('should list Node.js as a prerequisite', () => {
      expect(content.toLowerCase()).toContain('node');
    });

    it('should list npm or package manager as a prerequisite', () => {
      const hasPackageManager = content.toLowerCase().includes('npm') ||
                                content.toLowerCase().includes('yarn') ||
                                content.toLowerCase().includes('pnpm');
      expect(hasPackageManager).toBe(true);
    });

    it('should mention Supabase account requirement', () => {
      expect(content.toLowerCase()).toContain('supabase');
    });

    it('should have 5 steps or less for setup', () => {
      // Match numbered steps like "1.", "2.", etc. or "Step 1", "Step 2", etc.
      const stepMatches = content.match(/(?:^|\n)(?:Step\s+)?(\d+)[\.\):\s]/gm) || [];
      const uniqueSteps = new Set(stepMatches.map(match => {
        const num = match.match(/(\d+)/);
        return num ? parseInt(num[1]) : 0;
      }));

      // Should have steps but no more than 5
      expect(uniqueSteps.size).toBeGreaterThan(0);
      expect(Math.max(...Array.from(uniqueSteps))).toBeLessThanOrEqual(5);
    });

    it('should have verification checklist section', () => {
      const hasVerification = content.toLowerCase().includes('verification') ||
                              content.toLowerCase().includes('verify') ||
                              content.toLowerCase().includes('checklist') ||
                              content.toLowerCase().includes('check');
      expect(hasVerification).toBe(true);
    });

    it('should mention time target (under 15 minutes)', () => {
      const hasTimeTarget = content.includes('15') &&
                           (content.toLowerCase().includes('minute') || content.toLowerCase().includes('min'));
      expect(hasTimeTarget).toBe(true);
    });

    it('should reference starter kits', () => {
      const mentionsKits = content.toLowerCase().includes('ios') ||
                          content.toLowerCase().includes('backend') ||
                          content.toLowerCase().includes('web');
      expect(mentionsKits).toBe(true);
    });

    it('should have code blocks for commands', () => {
      // Should have at least one code block with bash/shell commands
      expect(content).toMatch(/```(?:bash|sh|shell)?/);
    });

    it('should be concise (under 500 lines)', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(500);
    });
  });
});
