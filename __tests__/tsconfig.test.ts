import * as fs from 'fs';
import * as path from 'path';

describe('TypeScript Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');

  let tsconfig: any;

  beforeAll(() => {
    if (fs.existsSync(tsconfigPath)) {
      const content = fs.readFileSync(tsconfigPath, 'utf-8');
      try {
        tsconfig = JSON.parse(content);
      } catch (e) {
        // If direct parse fails, try to handle it
        tsconfig = null;
      }
    }
  });

  describe('tsconfig.json', () => {
    test('should exist', () => {
      expect(fs.existsSync(tsconfigPath)).toBe(true);
    });

    test('should be valid JSON', () => {
      expect(tsconfig).toBeDefined();
    });

    test('should extend expo/tsconfig.base', () => {
      expect(tsconfig.extends).toBe('expo/tsconfig.base');
    });

    test('should have strict mode enabled', () => {
      expect(tsconfig.compilerOptions?.strict).toBe(true);
    });

    test('should have path aliases configured', () => {
      expect(tsconfig.compilerOptions?.paths).toBeDefined();

      const paths = tsconfig.compilerOptions.paths;

      // Should have at least one path alias
      expect(Object.keys(paths).length).toBeGreaterThan(0);

      // Common aliases
      expect(
        paths['@/*'] ||
        paths['@components/*'] ||
        paths['@lib/*'] ||
        paths['@hooks/*']
      ).toBeDefined();
    });

    test('should have baseUrl set', () => {
      expect(tsconfig.compilerOptions?.baseUrl).toBeDefined();
    });

    test('should include necessary files', () => {
      expect(tsconfig.include).toBeDefined();
      expect(Array.isArray(tsconfig.include)).toBe(true);
      expect(tsconfig.include.length).toBeGreaterThan(0);
    });

    test('should have proper compiler options for React Native', () => {
      const options = tsconfig.compilerOptions;

      expect(options?.jsx).toBeDefined();
      expect(options?.esModuleInterop).toBe(true);
      expect(options?.skipLibCheck).toBe(true);
      expect(options?.resolveJsonModule).toBe(true);
    });
  });
});
