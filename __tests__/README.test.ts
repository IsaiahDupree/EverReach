import * as fs from 'fs';
import * as path from 'path';

describe('Web Frontend README', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readmeContent: string;

  beforeAll(() => {
    // This test will initially fail (RED phase of TDD)
    expect(fs.existsSync(readmePath)).toBe(true);
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  describe('Required Sections', () => {
    const requiredSections = [
      'Overview',
      'Prerequisites',
      'Quick Start',
      'Environment Setup',
      'Available Scripts',
      'Architecture',
      'Deployment',
      'Troubleshooting'
    ];

    requiredSections.forEach((section) => {
      test(`should contain ${section} section`, () => {
        const sectionRegex = new RegExp(`##\\s+${section}`, 'i');
        expect(readmeContent).toMatch(sectionRegex);
      });
    });
  });

  describe('Overview Section', () => {
    test('should describe the web starter kit purpose', () => {
      expect(readmeContent).toMatch(/Next\.?js/i);
      expect(readmeContent).toMatch(/Tailwind/i);
      expect(readmeContent).toMatch(/Supabase/i);
    });

    test('should mention key features', () => {
      expect(readmeContent).toMatch(/authentication/i);
      expect(readmeContent).toMatch(/payment/i);
      expect(readmeContent).toMatch(/dark mode/i);
    });
  });

  describe('Prerequisites Section', () => {
    test('should list Node.js requirement', () => {
      expect(readmeContent).toMatch(/Node\.?js/i);
      expect(readmeContent).toMatch(/18\+/);
    });

    test('should list required accounts', () => {
      expect(readmeContent).toMatch(/Supabase/i);
      expect(readmeContent).toMatch(/Vercel/i);
      expect(readmeContent).toMatch(/Stripe/i);
    });
  });

  describe('Quick Start Section', () => {
    test('should include installation commands', () => {
      expect(readmeContent).toMatch(/npm install/);
      expect(readmeContent).toMatch(/npm run dev/);
    });

    test('should include environment setup', () => {
      expect(readmeContent).toMatch(/\.env/i);
      expect(readmeContent).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    test('should include verification steps', () => {
      expect(readmeContent).toMatch(/localhost:3000/i);
    });
  });

  describe('Environment Setup Section', () => {
    test('should document all required environment variables', () => {
      expect(readmeContent).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
      expect(readmeContent).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      expect(readmeContent).toMatch(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
    });

    test('should explain variable purposes', () => {
      // Just check that the section exists and mentions key services
      expect(readmeContent).toMatch(/Environment Setup/i);
      expect(readmeContent).toMatch(/Supabase/i);
      expect(readmeContent).toMatch(/Stripe/i);
    });
  });

  describe('Available Scripts Section', () => {
    test('should document npm run dev', () => {
      expect(readmeContent).toMatch(/npm run dev/);
    });

    test('should document npm run build', () => {
      expect(readmeContent).toMatch(/npm run build/);
    });

    test('should document npm run start', () => {
      expect(readmeContent).toMatch(/npm run start/);
    });

    test('should document npm run test', () => {
      expect(readmeContent).toMatch(/npm run test/);
    });
  });

  describe('Architecture Section', () => {
    test('should describe the tech stack', () => {
      expect(readmeContent).toMatch(/Next\.?js/i);
      expect(readmeContent).toMatch(/Tailwind/i);
      expect(readmeContent).toMatch(/shadcn/i);
      expect(readmeContent).toMatch(/React Query/i);
    });

    test('should describe folder structure', () => {
      expect(readmeContent).toMatch(/app\//);
      expect(readmeContent).toMatch(/components\//);
      expect(readmeContent).toMatch(/lib\//);
    });
  });

  describe('Deployment Section', () => {
    test('should include Vercel deployment instructions', () => {
      expect(readmeContent).toMatch(/Vercel/i);
      expect(readmeContent).toMatch(/vercel/i);
    });

    test('should mention environment variables in production', () => {
      expect(readmeContent).toMatch(/Deployment/i);
      expect(readmeContent).toMatch(/environment|env/i);
    });
  });

  describe('Troubleshooting Section', () => {
    test('should include common issues', () => {
      expect(readmeContent).toMatch(/##\s+Troubleshooting/i);
      expect(readmeContent).toMatch(/Issue:/i);
      expect(readmeContent).toMatch(/Solution:/i);
    });

    test('should cover build errors', () => {
      expect(readmeContent).toMatch(/build|error/i);
    });
  });

  describe('Commands Work', () => {
    test('should have valid package.json scripts referenced', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check that documented commands exist in package.json
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });
  });

  describe('Standard Scripts (HO-SCRIPTS-001)', () => {
    let packageJson: any;

    beforeAll(() => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    });

    test('should not have rork as a dependency', () => {
      expect(packageJson.dependencies?.rork).toBeUndefined();
      expect(packageJson.devDependencies?.rork).toBeUndefined();
    });

    test('should use standard Next.js dev command', () => {
      expect(packageJson.scripts.dev).toBe('next dev');
    });

    test('should use standard Next.js build command', () => {
      expect(packageJson.scripts.build).toBe('next build');
    });

    test('should use standard Next.js start command', () => {
      expect(packageJson.scripts.start).toBe('next start');
    });

    test('should use standard Next.js lint command', () => {
      expect(packageJson.scripts.lint).toBe('next lint');
    });

    test('should not reference rork in README', () => {
      expect(readmeContent.toLowerCase()).not.toContain('rork');
    });

    test('should document all scripts in README', () => {
      expect(readmeContent).toContain('npm run dev');
      expect(readmeContent).toContain('npm run build');
      expect(readmeContent).toContain('npm run start');
      expect(readmeContent).toContain('npm run lint');
    });
  });
});
