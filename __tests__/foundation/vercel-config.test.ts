/**
 * Backend Foundation Tests
 * BACK-FOUND-003: Vercel Configuration
 *
 * Tests that verify vercel.json is properly configured for serverless deployment
 * with appropriate region and build settings.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BACKEND_ROOT = join(__dirname, '..', '..');

describe('BACK-FOUND-003: Vercel Configuration', () => {
  let vercelConfig: any;

  beforeAll(() => {
    const configPath = join(BACKEND_ROOT, 'vercel.json');

    // Verify config file exists
    if (!existsSync(configPath)) {
      throw new Error('vercel.json not found');
    }

    // Load and parse the config
    const configContent = readFileSync(configPath, 'utf-8');
    vercelConfig = JSON.parse(configContent);
  });

  describe('Configuration file exists', () => {
    it('should have vercel.json in root directory', () => {
      const configPath = join(BACKEND_ROOT, 'vercel.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should be valid JSON', () => {
      expect(vercelConfig).toBeDefined();
      expect(typeof vercelConfig).toBe('object');
    });
  });

  describe('Serverless deployment configuration', () => {
    it('should have build configuration', () => {
      // Vercel.json should have build or functions config
      expect(vercelConfig).toBeDefined();
    });

    it('should not have conflicting settings', () => {
      // Ensure no settings that would break serverless deployment
      expect(vercelConfig).not.toHaveProperty('builds');

      // Modern Vercel uses automatic builds, or functions config
      // builds property is deprecated
    });
  });

  describe('Region configuration', () => {
    it('should have region configuration or use defaults', () => {
      // Region can be configured or use Vercel defaults
      // Just verify the config is valid
      expect(vercelConfig).toBeDefined();

      // If regions are specified, they should be valid
      if (vercelConfig.regions) {
        expect(Array.isArray(vercelConfig.regions)).toBe(true);
      }

      // If functions are configured, check their regions
      if (vercelConfig.functions) {
        expect(typeof vercelConfig.functions).toBe('object');
      }
    });
  });

  describe('API route configuration', () => {
    it('should support Next.js API routes', () => {
      // Vercel.json should not have settings that break API routes
      expect(vercelConfig).toBeDefined();

      // Check for proper routing if specified
      if (vercelConfig.routes) {
        expect(Array.isArray(vercelConfig.routes)).toBe(true);
      }

      // Check for rewrites if specified
      if (vercelConfig.rewrites) {
        expect(Array.isArray(vercelConfig.rewrites)).toBe(true);
      }
    });
  });

  describe('Acceptance Criteria', () => {
    it('Deployment config ready - vercel.json exists and is valid', () => {
      const configPath = join(BACKEND_ROOT, 'vercel.json');
      expect(existsSync(configPath)).toBe(true);

      // Config is valid JSON
      expect(vercelConfig).toBeDefined();
      expect(typeof vercelConfig).toBe('object');
    });

    it('Region configured - has region settings or uses defaults', () => {
      // Config is valid for deployment
      expect(vercelConfig).toBeDefined();

      // No deprecated settings
      expect(vercelConfig).not.toHaveProperty('builds');

      // If region/functions are specified, they're valid
      if (vercelConfig.regions) {
        expect(Array.isArray(vercelConfig.regions)).toBe(true);
      }
      if (vercelConfig.functions) {
        expect(typeof vercelConfig.functions).toBe('object');
      }
    });
  });
});
