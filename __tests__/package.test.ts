import * as fs from 'fs';
import * as path from 'path';

describe('Backend Package Configuration', () => {
  let packageJson: any;

  beforeAll(() => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf-8');
    packageJson = JSON.parse(packageContent);
  });

  describe('package.json structure', () => {
    it('should have a valid name', () => {
      expect(packageJson.name).toBeDefined();
      expect(typeof packageJson.name).toBe('string');
      expect(packageJson.name).toContain('backend');
    });

    it('should have a version', () => {
      expect(packageJson.version).toBeDefined();
      expect(typeof packageJson.version).toBe('string');
    });

    it('should have a description', () => {
      expect(packageJson.description).toBeDefined();
      expect(typeof packageJson.description).toBe('string');
    });
  });

  describe('required dependencies', () => {
    it('should include Next.js', () => {
      expect(packageJson.dependencies.next).toBeDefined();
    });

    it('should include Supabase client', () => {
      expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined();
    });

    it('should include Supabase SSR helpers', () => {
      expect(packageJson.dependencies['@supabase/ssr']).toBeDefined();
    });

    it('should include Stripe', () => {
      expect(packageJson.dependencies.stripe).toBeDefined();
    });

    it('should include Zod for validation', () => {
      expect(packageJson.dependencies.zod).toBeDefined();
    });
  });

  describe('required dev dependencies', () => {
    it('should include TypeScript', () => {
      expect(packageJson.devDependencies.typescript).toBeDefined();
    });

    it('should include Node types', () => {
      expect(packageJson.devDependencies['@types/node']).toBeDefined();
    });

    it('should include Jest for testing', () => {
      expect(packageJson.devDependencies.jest).toBeDefined();
    });

    it('should include Jest types', () => {
      expect(packageJson.devDependencies['@types/jest']).toBeDefined();
    });

    it('should include ts-jest', () => {
      expect(packageJson.devDependencies['ts-jest']).toBeDefined();
    });
  });

  describe('required scripts', () => {
    it('should have dev script', () => {
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.dev).toContain('next dev');
    });

    it('should have build script', () => {
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.build).toContain('next build');
    });

    it('should have start script', () => {
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.start).toContain('next start');
    });

    it('should have lint script', () => {
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.lint).toContain('lint');
    });

    it('should have test script', () => {
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.test).toContain('jest');
    });

    it('should have test:watch script', () => {
      expect(packageJson.scripts['test:watch']).toBeDefined();
      expect(packageJson.scripts['test:watch']).toContain('jest --watch');
    });

    it('should have test:coverage script', () => {
      expect(packageJson.scripts['test:coverage']).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toContain('jest --coverage');
    });

    it('should have type-check script', () => {
      expect(packageJson.scripts['type-check']).toBeDefined();
      expect(packageJson.scripts['type-check']).toContain('tsc');
    });
  });

  describe('node engine requirements', () => {
    it('should specify minimum Node.js version', () => {
      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toBeDefined();
      expect(packageJson.engines.node).toMatch(/>=18/);
    });
  });

  describe('Standard Backend Scripts (HO-SCRIPTS-003)', () => {
    it('should not have rork as a dependency', () => {
      expect(packageJson.dependencies?.rork).toBeUndefined();
      expect(packageJson.devDependencies?.rork).toBeUndefined();
    });

    it('should use standard Next.js dev command', () => {
      expect(packageJson.scripts.dev).toBe('next dev');
    });

    it('should use standard Next.js build command', () => {
      expect(packageJson.scripts.build).toBe('next build');
    });

    it('should use standard Next.js start command', () => {
      expect(packageJson.scripts.start).toBe('next start');
    });

    it('should use standard Next.js lint command', () => {
      expect(packageJson.scripts.lint).toBe('next lint');
    });

    it('should have test scripts with jest', () => {
      expect(packageJson.scripts.test).toContain('jest');
      expect(packageJson.scripts['test:watch']).toContain('jest --watch');
      expect(packageJson.scripts['test:coverage']).toContain('jest --coverage');
    });

    it('should have type-check script', () => {
      expect(packageJson.scripts['type-check']).toContain('tsc --noEmit');
    });

    it('should use standard npm/Next.js commands (no custom wrappers)', () => {
      const scripts = packageJson.scripts;

      // Ensure we're using standard commands, not rork or other wrappers
      Object.keys(scripts).forEach(key => {
        expect(scripts[key]).not.toContain('rork');
      });
    });
  });
});
