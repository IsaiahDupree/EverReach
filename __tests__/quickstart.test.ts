import fs from 'fs';
import path from 'path';

describe('QUICKSTART.md Documentation', () => {
  let quickstartContent: string;
  const quickstartPath = path.join(__dirname, '..', 'QUICKSTART.md');

  beforeAll(() => {
    quickstartContent = fs.readFileSync(quickstartPath, 'utf-8');
  });

  describe('File Existence', () => {
    it('should exist in the web-kit root directory', () => {
      expect(fs.existsSync(quickstartPath)).toBe(true);
    });
  });

  describe('15-Minute Setup Guide Requirements', () => {
    it('should mention time estimate in title or introduction', () => {
      const hasTimeEstimate =
        quickstartContent.includes('15 minute') ||
        quickstartContent.includes('15-minute') ||
        quickstartContent.includes('15 min');
      expect(hasTimeEstimate).toBe(true);
    });

    it('should include step breakdown with time estimates', () => {
      expect(quickstartContent).toMatch(/Step \d+:/);
      expect(quickstartContent).toMatch(/\d+ min/);
    });
  });

  describe('Prerequisites Section', () => {
    it('should list required software', () => {
      expect(quickstartContent.toLowerCase()).toContain('node');
      expect(quickstartContent.toLowerCase()).toContain('npm');
      expect(quickstartContent.toLowerCase()).toContain('git');
    });

    it('should list required accounts', () => {
      expect(quickstartContent.toLowerCase()).toContain('supabase');
      expect(quickstartContent.toLowerCase()).toContain('stripe');
    });
  });

  describe('Step 1: Clone & Install', () => {
    it('should include clone instructions', () => {
      expect(quickstartContent).toContain('git clone');
    });

    it('should include install command', () => {
      expect(quickstartContent).toContain('npm install');
    });
  });

  describe('Step 2: Supabase Setup', () => {
    it('should explain how to create Supabase project', () => {
      expect(quickstartContent.toLowerCase()).toContain('create');
      expect(quickstartContent.toLowerCase()).toContain('supabase');
      expect(quickstartContent.toLowerCase()).toContain('project');
    });

    it('should explain how to get API keys', () => {
      expect(quickstartContent).toContain('SUPABASE_URL');
      expect(quickstartContent).toContain('SUPABASE_ANON_KEY');
    });

    it('should mention database schema setup', () => {
      expect(quickstartContent.toLowerCase()).toContain('schema');
      expect(quickstartContent.toLowerCase()).toContain('sql');
    });

    it('should mention auth configuration', () => {
      expect(quickstartContent.toLowerCase()).toContain('auth');
      expect(quickstartContent.toLowerCase()).toContain('redirect');
    });
  });

  describe('Step 3: Stripe Setup', () => {
    it('should explain Stripe account creation', () => {
      expect(quickstartContent.toLowerCase()).toContain('stripe');
      expect(quickstartContent.toLowerCase()).toContain('account');
    });

    it('should explain how to get API keys', () => {
      expect(quickstartContent).toContain('STRIPE_PUBLISHABLE_KEY');
      expect(quickstartContent).toContain('STRIPE_SECRET_KEY');
    });

    it('should mention webhook setup', () => {
      expect(quickstartContent.toLowerCase()).toContain('webhook');
    });

    it('should be marked as optional', () => {
      // Look specifically for "Step 3" and Stripe together
      const step3Index = quickstartContent.indexOf('Step 3');
      const stripeSection = quickstartContent.substring(
        step3Index,
        step3Index + 500
      );
      const hasOptionalMarker =
        stripeSection.toLowerCase().includes('optional') ||
        stripeSection.toLowerCase().includes('skip');
      expect(hasOptionalMarker).toBe(true);
    });
  });

  describe('Step 4: Environment Configuration', () => {
    it('should show how to create .env.local file', () => {
      expect(quickstartContent).toContain('.env');
      expect(quickstartContent).toContain('cp .env.example');
    });

    it('should list all required environment variables', () => {
      expect(quickstartContent).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(quickstartContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(quickstartContent).toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      expect(quickstartContent).toContain('STRIPE_SECRET_KEY');
      expect(quickstartContent).toContain('NEXT_PUBLIC_APP_URL');
    });
  });

  describe('Step 5: Run Application', () => {
    it('should include command to start dev server', () => {
      expect(quickstartContent).toContain('npm run dev');
    });

    it('should mention localhost URL', () => {
      expect(quickstartContent).toContain('localhost:3000');
    });
  });

  describe('Step 6: Testing Features', () => {
    it('should include instructions to test authentication', () => {
      expect(quickstartContent.toLowerCase()).toContain('test');
      expect(quickstartContent.toLowerCase()).toContain('sign up');
      expect(quickstartContent.toLowerCase()).toContain('log in');
    });

    it('should mention dashboard access', () => {
      expect(quickstartContent.toLowerCase()).toContain('dashboard');
    });
  });

  describe('Troubleshooting Section', () => {
    it('should include common issues', () => {
      const hasTroubleshooting =
        quickstartContent.toLowerCase().includes('troubleshoot') ||
        quickstartContent.toLowerCase().includes('common issue') ||
        quickstartContent.toLowerCase().includes('problem');
      expect(hasTroubleshooting).toBe(true);
    });

    it('should provide solutions', () => {
      const hasSolutions =
        quickstartContent.toLowerCase().includes('solution') ||
        quickstartContent.toLowerCase().includes('fix');
      expect(hasSolutions).toBe(true);
    });
  });

  describe('Next Steps Section', () => {
    it('should guide users on what to do next', () => {
      const hasNextSteps =
        quickstartContent.toLowerCase().includes('next step') ||
        quickstartContent.toLowerCase().includes('what to do next') ||
        quickstartContent.toLowerCase().includes('customize');
      expect(hasNextSteps).toBe(true);
    });

    it('should reference other documentation', () => {
      const hasDocReferences =
        quickstartContent.includes('CUSTOMIZATION.md') ||
        quickstartContent.includes('DEPLOYMENT.md') ||
        quickstartContent.toLowerCase().includes('see docs');
      expect(hasDocReferences).toBe(true);
    });
  });

  describe('Formatting and Structure', () => {
    it('should use markdown formatting', () => {
      // Check for headers
      expect(quickstartContent).toMatch(/^#+ /m);
      // Check for code blocks
      expect(quickstartContent).toContain('```');
    });

    it('should have clear section headers', () => {
      const headerCount = (quickstartContent.match(/^#+\s/gm) || []).length;
      expect(headerCount).toBeGreaterThan(10);
    });

    it('should use code blocks for commands', () => {
      const codeBlockCount = (quickstartContent.match(/```/g) || []).length;
      // Should be even (opening and closing)
      expect(codeBlockCount % 2).toBe(0);
      // Should have multiple code blocks
      expect(codeBlockCount).toBeGreaterThan(10);
    });

    it('should include checklists or tables', () => {
      const hasStructure =
        quickstartContent.includes('[ ]') ||
        quickstartContent.includes('|') ||
        quickstartContent.includes('- [ ]');
      expect(hasStructure).toBe(true);
    });
  });

  describe('Content Quality', () => {
    it('should be comprehensive (at least 300 lines)', () => {
      const lineCount = quickstartContent.split('\n').length;
      expect(lineCount).toBeGreaterThan(300);
    });

    it('should include visual separators', () => {
      const hasSeparators =
        quickstartContent.includes('---') ||
        quickstartContent.includes('***');
      expect(hasSeparators).toBe(true);
    });

    it('should use emojis or visual markers for important points', () => {
      const hasVisualMarkers =
        quickstartContent.includes('✅') ||
        quickstartContent.includes('⚠️') ||
        quickstartContent.includes('🎉') ||
        quickstartContent.includes('**Note:**') ||
        quickstartContent.includes('**Important:**');
      expect(hasVisualMarkers).toBe(true);
    });
  });

  describe('Acceptance Criteria from Feature List', () => {
    it('should be a 15-minute guide', () => {
      // Check that total time mentioned is around 15-20 minutes
      const timePattern = /(?:15|20)[\s-]*min/i;
      expect(quickstartContent).toMatch(timePattern);
    });

    it('should cover all steps', () => {
      const requiredSteps = [
        'clone',
        'install',
        'supabase',
        'environment',
        'run',
        'test'
      ];

      requiredSteps.forEach(step => {
        expect(quickstartContent.toLowerCase()).toContain(step);
      });
    });
  });
});
