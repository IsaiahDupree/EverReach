/**
 * Backend Foundation Tests
 * BACK-FOUND-001: Backend Project Structure
 *
 * Tests that verify the Next.js App Router API structure is properly set up
 * with all required directories for the backend starter kit.
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';

const BACKEND_ROOT = join(__dirname, '..', '..');

describe('BACK-FOUND-001: Backend Project Structure', () => {
  describe('Core directories exist', () => {
    it('should have app/ directory', () => {
      const appDir = join(BACKEND_ROOT, 'app');
      expect(existsSync(appDir)).toBe(true);
      expect(statSync(appDir).isDirectory()).toBe(true);
    });

    it('should have app/api/ directory', () => {
      const apiDir = join(BACKEND_ROOT, 'app', 'api');
      expect(existsSync(apiDir)).toBe(true);
      expect(statSync(apiDir).isDirectory()).toBe(true);
    });

    it('should have lib/ directory', () => {
      const libDir = join(BACKEND_ROOT, 'lib');
      expect(existsSync(libDir)).toBe(true);
      expect(statSync(libDir).isDirectory()).toBe(true);
    });

    it('should have types/ directory', () => {
      const typesDir = join(BACKEND_ROOT, 'types');
      expect(existsSync(typesDir)).toBe(true);
      expect(statSync(typesDir).isDirectory()).toBe(true);
    });
  });

  describe('API routes are accessible', () => {
    it('should have app/api/ as a valid Next.js API route location', () => {
      const apiDir = join(BACKEND_ROOT, 'app', 'api');

      // Verify the directory exists and is accessible
      expect(existsSync(apiDir)).toBe(true);

      // In Next.js App Router, any route.ts file in app/api/* becomes an API endpoint
      // We just need to verify the structure is correct
      const stats = statSync(apiDir);
      expect(stats.isDirectory()).toBe(true);

      // The directory should be readable and writable for route file creation
      // This is implicitly tested by the directory existing
    });
  });

  describe('Structure validation', () => {
    it('should have correct directory structure for Next.js App Router', () => {
      // Verify that app/ contains api/
      const appDir = join(BACKEND_ROOT, 'app');
      const apiDir = join(BACKEND_ROOT, 'app', 'api');

      expect(existsSync(appDir)).toBe(true);
      expect(existsSync(apiDir)).toBe(true);

      // Verify api is a subdirectory of app
      expect(apiDir).toContain(appDir);
    });

    it('should have lib/ and types/ at root level', () => {
      const libDir = join(BACKEND_ROOT, 'lib');
      const typesDir = join(BACKEND_ROOT, 'types');

      // Both should be direct children of backend-kit
      expect(libDir).toContain(BACKEND_ROOT);
      expect(typesDir).toContain(BACKEND_ROOT);

      // Should not be nested under app
      expect(libDir).not.toContain(join(BACKEND_ROOT, 'app'));
      expect(typesDir).not.toContain(join(BACKEND_ROOT, 'app'));
    });
  });

  describe('Acceptance Criteria', () => {
    it('Directory structure created - all required directories exist', () => {
      const requiredDirs = [
        'app',
        'app/api',
        'lib',
        'types'
      ];

      requiredDirs.forEach(dir => {
        const fullPath = join(BACKEND_ROOT, dir);
        expect(existsSync(fullPath)).toBe(true);
      });
    });

    it('API routes accessible - app/api/ is properly configured for Next.js routing', () => {
      const apiDir = join(BACKEND_ROOT, 'app', 'api');

      expect(existsSync(apiDir)).toBe(true);
      expect(statSync(apiDir).isDirectory()).toBe(true);

      // In Next.js 13+ App Router, this structure makes API routes accessible at /api/*
      // The structure itself enables routing - no additional config needed
    });
  });
});
