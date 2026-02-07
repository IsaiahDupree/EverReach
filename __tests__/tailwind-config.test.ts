import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Tailwind Configuration', () => {
  const rootDir = join(__dirname, '..');
  const tailwindConfigPath = join(rootDir, 'tailwind.config.ts');
  const globalsCssPath = join(rootDir, 'app/globals.css');

  describe('tailwind.config.ts', () => {
    test('should exist', () => {
      expect(existsSync(tailwindConfigPath)).toBe(true);
    });

    test('should have custom colors defined', () => {
      const content = readFileSync(tailwindConfigPath, 'utf-8');

      // Should define custom color variables
      expect(content).toMatch(/colors.*background/s);
      expect(content).toMatch(/colors.*foreground/s);
      expect(content).toMatch(/colors.*primary/s);
      expect(content).toMatch(/colors.*secondary/s);
      expect(content).toMatch(/colors.*muted/s);
      expect(content).toMatch(/colors.*accent/s);
    });

    test('should have dark mode support configured', () => {
      const content = readFileSync(tailwindConfigPath, 'utf-8');

      // Should enable dark mode with class strategy
      expect(content).toMatch(/darkMode.*['"]class['"]/);
    });

    test('should have content paths configured', () => {
      const content = readFileSync(tailwindConfigPath, 'utf-8');

      // Should include all relevant paths for purging
      expect(content).toMatch(/\.\/app\/\*\*\/\*\.\{ts,tsx\}/);
      expect(content).toMatch(/\.\/components\/\*\*\/\*\.\{ts,tsx\}/);
    });

    test('should extend theme with custom properties', () => {
      const content = readFileSync(tailwindConfigPath, 'utf-8');

      // Should extend the theme
      expect(content).toMatch(/extend:/);
      expect(content).toMatch(/borderRadius/);
    });
  });

  describe('globals.css', () => {
    test('should exist', () => {
      expect(existsSync(globalsCssPath)).toBe(true);
    });

    test('should include Tailwind directives', () => {
      const content = readFileSync(globalsCssPath, 'utf-8');

      // Must have the three core Tailwind directives
      expect(content).toMatch(/@tailwind base/);
      expect(content).toMatch(/@tailwind components/);
      expect(content).toMatch(/@tailwind utilities/);
    });

    test('should define CSS custom properties for light mode', () => {
      const content = readFileSync(globalsCssPath, 'utf-8');

      // Should define CSS variables in :root
      expect(content).toMatch(/:root/);
      expect(content).toMatch(/--background:/);
      expect(content).toMatch(/--foreground:/);
      expect(content).toMatch(/--primary:/);
      expect(content).toMatch(/--secondary:/);
      expect(content).toMatch(/--muted:/);
      expect(content).toMatch(/--accent:/);
      expect(content).toMatch(/--border:/);
      expect(content).toMatch(/--input:/);
      expect(content).toMatch(/--ring:/);
    });

    test('should define CSS custom properties for dark mode', () => {
      const content = readFileSync(globalsCssPath, 'utf-8');

      // Should define dark mode variables
      expect(content).toMatch(/\.dark/);

      // Verify dark mode has the same variables defined
      const darkModeSection = content.match(/\.dark\s*{[^}]+}/s);
      expect(darkModeSection).toBeTruthy();

      if (darkModeSection) {
        expect(darkModeSection[0]).toMatch(/--background:/);
        expect(darkModeSection[0]).toMatch(/--foreground:/);
      }
    });

    test('should apply CSS variables to base layer', () => {
      const content = readFileSync(globalsCssPath, 'utf-8');

      // Should apply variables in @layer base
      expect(content).toMatch(/@layer base/);
    });
  });
});
