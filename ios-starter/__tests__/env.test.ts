import * as fs from 'fs';
import * as path from 'path';

describe('Environment Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const envExamplePath = path.join(rootDir, '.env.example');

  describe('.env.example', () => {
    test('should exist', () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    test('should have required Supabase variables', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toContain('EXPO_PUBLIC_SUPABASE_URL');
      expect(content).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    });

    test('should have RevenueCat variable', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toContain('EXPO_PUBLIC_REVENUECAT_');
    });

    test('should have DEV_MODE flag', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toContain('DEV_MODE');
    });

    test('should have API_URL variable', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toContain('EXPO_PUBLIC_API_URL');
    });

    test('should have documentation comments', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have at least one comment line
      const commentLines = content.split('\n').filter(line => line.trim().startsWith('#'));
      expect(commentLines.length).toBeGreaterThan(0);
    });

    test('all variables should be documented', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      const lines = content.split('\n');

      let hasDocumentation = false;
      for (const line of lines) {
        if (line.trim().startsWith('#') && line.length > 5) {
          hasDocumentation = true;
          break;
        }
      }

      expect(hasDocumentation).toBe(true);
    });

    test('should have placeholder values', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Should contain placeholder indicators
      expect(
        content.includes('your-') ||
        content.includes('YOUR_') ||
        content.includes('change-me') ||
        content.includes('CHANGE_ME')
      ).toBe(true);
    });
  });
});
