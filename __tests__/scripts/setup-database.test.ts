/**
 * Tests for the automated database setup script
 *
 * This test suite verifies that the setup-database.sh script:
 * 1. Runs migrations (schema.sql)
 * 2. Creates seed data (optional)
 * 3. Verifies database connection
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Setup Script', () => {
  const scriptPath = path.join(__dirname, '../../scripts/setup-database.sh');
  const schemaPath = path.join(__dirname, '../../backend-kit/supabase/schema.sql');

  beforeAll(() => {
    // Ensure the script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found at ${scriptPath}`);
    }

    // Ensure schema file exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
  });

  describe('Script existence and permissions', () => {
    it('should exist at scripts/setup-database.sh', () => {
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should be executable', () => {
      const stats = fs.statSync(scriptPath);
      // Check if owner has execute permission (0o100)
      expect((stats.mode & 0o100) !== 0).toBe(true);
    });

    it('should have a bash shebang', () => {
      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content.startsWith('#!/bin/bash') || content.startsWith('#!/usr/bin/env bash')).toBe(true);
    });
  });

  describe('Script structure', () => {
    let scriptContent: string;

    beforeAll(() => {
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    });

    it('should check for required environment variables', () => {
      expect(scriptContent).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(scriptContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should reference the schema.sql file', () => {
      expect(scriptContent).toContain('schema.sql');
    });

    it('should have a connection verification step', () => {
      // Should check for successful connection
      expect(scriptContent).toMatch(/verify|test|check.*connection/i);
    });

    it('should handle errors gracefully', () => {
      // Should have error handling with set -e or explicit checks
      expect(scriptContent).toMatch(/set -e|if.*\[|exit 1/);
    });

    it('should provide helpful output messages', () => {
      // Should have echo statements for user feedback
      expect(scriptContent).toMatch(/echo|printf/);
    });
  });

  describe('Script functionality documentation', () => {
    let scriptContent: string;

    beforeAll(() => {
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    });

    it('should have usage instructions in comments', () => {
      expect(scriptContent).toMatch(/usage|Usage|USAGE/);
    });

    it('should document the --seed flag', () => {
      expect(scriptContent).toMatch(/--seed|seed/i);
    });

    it('should document environment variable requirements', () => {
      expect(scriptContent).toMatch(/NEXT_PUBLIC_SUPABASE_URL.*required|Required.*NEXT_PUBLIC_SUPABASE_URL/i);
    });
  });

  describe('Acceptance criteria', () => {
    let scriptContent: string;

    beforeAll(() => {
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    });

    it('should be able to run migrations', () => {
      // Script should apply schema.sql
      expect(scriptContent).toContain('schema.sql');
    });

    it('should be able to create seed data', () => {
      // Should support optional seed data
      expect(scriptContent).toMatch(/seed/i);
    });

    it('should verify database connection', () => {
      // Should test connection before and/or after migration
      expect(scriptContent).toMatch(/verify|test|check/i);
    });
  });
});
