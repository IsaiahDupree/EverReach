import * as fs from 'fs';
import * as path from 'path';

describe('Expo Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const appJsonPath = path.join(rootDir, 'app.json');
  const easJsonPath = path.join(rootDir, 'eas.json');

  describe('app.json', () => {
    test('should exist', () => {
      expect(fs.existsSync(appJsonPath)).toBe(true);
    });

    test('should be valid JSON', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('should have expo configuration', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.expo).toBeDefined();
    });

    test('should have YOUR_APP_NAME placeholder', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.expo.name).toContain('YOUR_APP_NAME');
    });

    test('should have bundle identifier placeholder', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      const config = JSON.parse(content);

      // Check iOS bundle ID
      expect(config.expo.ios?.bundleIdentifier).toBeDefined();
      expect(config.expo.ios.bundleIdentifier).toContain('com.yourcompany');

      // Check Android package
      expect(config.expo.android?.package).toBeDefined();
      expect(config.expo.android.package).toContain('com.yourcompany');
    });

    test('should have icon configuration', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.expo.icon).toBeDefined();
    });

    test('should have expo-router configuration', () => {
      const content = fs.readFileSync(appJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.expo.plugins).toContain('expo-router');
    });
  });

  describe('eas.json', () => {
    test('should exist', () => {
      expect(fs.existsSync(easJsonPath)).toBe(true);
    });

    test('should be valid JSON', () => {
      const content = fs.readFileSync(easJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('should have build configuration', () => {
      const content = fs.readFileSync(easJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.build).toBeDefined();
    });

    test('should have development, preview, and production profiles', () => {
      const content = fs.readFileSync(easJsonPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.build.development).toBeDefined();
      expect(config.build.preview).toBeDefined();
      expect(config.build.production).toBeDefined();
    });
  });
});
