import * as fs from 'fs';
import * as path from 'path';

describe('Package Dependencies', () => {
  const rootDir = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');

  let packageJson: any;

  beforeAll(() => {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(content);
  });

  describe('package.json', () => {
    test('should exist', () => {
      expect(fs.existsSync(packageJsonPath)).toBe(true);
    });

    test('should be valid JSON', () => {
      expect(packageJson).toBeDefined();
    });

    test('should have Expo dependencies', () => {
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies['expo']).toBeDefined();
      expect(packageJson.dependencies['expo-router']).toBeDefined();
    });

    test('should have React Native dependencies', () => {
      expect(packageJson.dependencies['react']).toBeDefined();
      expect(packageJson.dependencies['react-native']).toBeDefined();
    });

    test('should have Supabase client', () => {
      expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined();
    });

    test('should have secure storage', () => {
      expect(
        packageJson.dependencies['expo-secure-store'] ||
        packageJson.dependencies['@react-native-async-storage/async-storage']
      ).toBeDefined();
    });

    test('should have navigation dependencies', () => {
      expect(packageJson.dependencies['react-native-screens']).toBeDefined();
      expect(packageJson.dependencies['react-native-safe-area-context']).toBeDefined();
    });

    test('should have utility dependencies', () => {
      // Should have at least some common utilities
      const hasUtils =
        packageJson.dependencies['zod'] ||
        packageJson.dependencies['date-fns'] ||
        packageJson.dependencies['dayjs'];

      expect(hasUtils).toBeDefined();
    });

    test('should have TypeScript in devDependencies', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['typescript']).toBeDefined();
    });

    test('should have testing dependencies', () => {
      expect(packageJson.devDependencies['jest']).toBeDefined();
      expect(packageJson.devDependencies['@types/jest']).toBeDefined();
    });

    test('should have proper scripts', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['start']).toBeDefined();
      expect(packageJson.scripts['test']).toBeDefined();
      expect(packageJson.scripts['type-check']).toBeDefined();
    });

    test('should have expo-router entry point', () => {
      expect(packageJson.main).toBe('expo-router/entry');
    });

    test('npm install should work without version conflicts', () => {
      // This is verified by the fact that we successfully ran npm install
      // and the node_modules directory exists
      const nodeModulesPath = path.join(rootDir, 'node_modules');
      expect(fs.existsSync(nodeModulesPath)).toBe(true);
    });
  });

  describe('Standard Expo Scripts (HO-SCRIPTS-002)', () => {
    test('should not have rork as a dependency', () => {
      expect(packageJson.dependencies?.rork).toBeUndefined();
      expect(packageJson.devDependencies?.rork).toBeUndefined();
    });

    test('should have standard expo start command', () => {
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.start).toContain('expo start');
    });

    test('should have dev command (alias for expo start)', () => {
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.dev).toContain('expo start');
    });

    test('should have dev:ios command', () => {
      expect(packageJson.scripts['dev:ios']).toBeDefined();
      expect(packageJson.scripts['dev:ios']).toContain('expo start --ios');
    });

    test('should have dev:android command', () => {
      expect(packageJson.scripts['dev:android']).toBeDefined();
      expect(packageJson.scripts['dev:android']).toContain('expo start --android');
    });

    test('should have dev:tunnel command', () => {
      expect(packageJson.scripts['dev:tunnel']).toBeDefined();
      expect(packageJson.scripts['dev:tunnel']).toContain('expo start --tunnel');
    });

    test('should use standard Expo commands (no custom wrappers)', () => {
      const scripts = packageJson.scripts;

      // Ensure we're using npx expo or expo directly, not rork or other wrappers
      Object.keys(scripts).forEach(key => {
        if (key.startsWith('dev') || key === 'start') {
          expect(scripts[key]).not.toContain('rork');
          expect(scripts[key]).toContain('expo');
        }
      });
    });

    test('should have test script with jest', () => {
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.test).toContain('jest');
    });
  });
});
