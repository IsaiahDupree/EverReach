/**
 * Migration Documentation Tests
 *
 * Feature: HO-DB-002 - Migration Documentation
 *
 * Ensures that all Supabase migrations are properly documented with:
 * - Clear run order
 * - No missing migrations
 * - Comprehensive documentation
 */

import fs from 'fs';
import path from 'path';

describe('Migration Documentation (HO-DB-002)', () => {
  const backendKitRoot = path.join(__dirname, '../..');
  const migrationDocsPath = path.join(backendKitRoot, 'supabase/MIGRATIONS.md');
  const schemaPath = path.join(backendKitRoot, 'supabase/schema.sql');

  describe('Migration Documentation File', () => {
    test('should exist at backend-kit/supabase/MIGRATIONS.md', () => {
      expect(fs.existsSync(migrationDocsPath)).toBe(true);
    });

    test('should not be empty', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    test('should contain migration overview section', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/overview|introduction/);
      }
    });

    test('should document run order clearly', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/order|sequence|step/);
      }
    });

    test('should reference schema.sql file', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content).toMatch(/schema\.sql/);
      }
    });
  });

  describe('Migration Strategy', () => {
    test('should document how to apply migrations', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/apply|run|execute/);
      }
    });

    test('should document rollback strategy', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/rollback|revert|undo/);
      }
    });

    test('should document version control approach', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/version|timestamp|naming/);
      }
    });
  });

  describe('Migration Inventory', () => {
    test('should list all migrations', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        // Should have a list or table of migrations
        expect(content).toMatch(/\d+\.|[-*]\s|^\|/m);
      }
    });

    test('should verify schema.sql is documented', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content).toContain('schema.sql');
      }
    });

    test('should document what schema.sql creates', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/users.*table|subscriptions.*table|items.*table/);
      }
    });
  });

  describe('Schema File Validation', () => {
    test('schema.sql file should exist', () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    test('schema.sql should create users table', () => {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toMatch(/CREATE TABLE.*public\.users/i);
    });

    test('schema.sql should create subscriptions table', () => {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toMatch(/CREATE TABLE.*public\.subscriptions/i);
    });

    test('schema.sql should create items table', () => {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toMatch(/CREATE TABLE.*public\.items/i);
    });

    test('schema.sql should enable RLS', () => {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    });
  });

  describe('Documentation Quality', () => {
    test('should provide troubleshooting guidance', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/troubleshoot|common.*issue|error/);
      }
    });

    test('should explain migration best practices', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content.toLowerCase()).toMatch(/best.*practice|recommendation|tip/);
      }
    });

    test('should link to DATABASE_SETUP.md', () => {
      if (fs.existsSync(migrationDocsPath)) {
        const content = fs.readFileSync(migrationDocsPath, 'utf-8');
        expect(content).toMatch(/DATABASE_SETUP\.md/);
      }
    });
  });
});
