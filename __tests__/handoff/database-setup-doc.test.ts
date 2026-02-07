/**
 * Test for HO-DB-001: Database Setup Documentation
 *
 * This test verifies that the DATABASE_SETUP.md documentation exists and contains
 * all required sections for comprehensive Supabase setup guidance.
 */

import fs from 'fs';
import path from 'path';

describe('HO-DB-001: Database Setup Documentation', () => {
  const docPath = path.join(__dirname, '../../docs/DATABASE_SETUP.md');
  let docContent: string;

  beforeAll(() => {
    // Read the documentation file
    if (fs.existsSync(docPath)) {
      docContent = fs.readFileSync(docPath, 'utf-8');
    }
  });

  test('DATABASE_SETUP.md file should exist', () => {
    expect(fs.existsSync(docPath)).toBe(true);
  });

  test('should contain project creation instructions', () => {
    expect(docContent).toContain('Creating a Supabase Project');
    expect(docContent).toContain('supabase.com');
  });

  test('should document database schema', () => {
    expect(docContent).toContain('Database Schema');
    expect(docContent).toContain('users');
    expect(docContent).toContain('subscriptions');
    expect(docContent).toContain('items');
  });

  test('should explain migrations', () => {
    expect(docContent).toContain('Migration');
    expect(docContent).toContain('schema.sql');
  });

  test('should document Row Level Security (RLS)', () => {
    expect(docContent).toContain('Row Level Security');
    expect(docContent).toContain('RLS');
    expect(docContent).toContain('policies');
  });

  test('should document Edge Functions setup', () => {
    expect(docContent).toContain('Edge Functions');
  });

  test('should include environment variables configuration', () => {
    expect(docContent).toContain('Environment Variables');
    expect(docContent).toContain('SUPABASE_URL');
    expect(docContent).toContain('SUPABASE_ANON_KEY');
    expect(docContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  test('should provide step-by-step setup instructions', () => {
    // Should have numbered or bulleted lists
    expect(docContent).toMatch(/1\.|Step 1|##.*1/i);
    expect(docContent).toMatch(/2\.|Step 2|##.*2/i);
    expect(docContent).toMatch(/3\.|Step 3|##.*3/i);
  });

  test('should include table structure documentation', () => {
    expect(docContent).toContain('Table Structure');
    expect(docContent).toContain('users table');
    expect(docContent).toContain('subscriptions table');
    expect(docContent).toContain('items table');
  });

  test('should document RLS policies for each table', () => {
    expect(docContent).toContain('Users can view own');
    expect(docContent).toContain('Users can update own');
    expect(docContent).toContain('Users can insert own');
  });

  test('should include indexes and performance optimizations', () => {
    expect(docContent).toContain('Indexes');
    expect(docContent).toContain('performance');
  });

  test('should document subscription tiers and enums', () => {
    expect(docContent).toContain('subscription_tier');
    expect(docContent).toContain('subscription_status');
    expect(docContent).toContain('free');
    expect(docContent).toContain('basic');
    expect(docContent).toContain('premium');
  });

  test('should include trigger functions', () => {
    expect(docContent).toContain('Triggers');
    expect(docContent).toContain('handle_updated_at');
    expect(docContent).toContain('handle_new_user');
  });

  test('should document how to run migrations', () => {
    expect(docContent).toContain('SQL Editor');
    expect(docContent).toContain('Run');
  });

  test('should include connection string information', () => {
    expect(docContent).toContain('Connection String');
    expect(docContent).toContain('Project Settings');
  });

  test('should provide troubleshooting guidance', () => {
    expect(docContent).toContain('Troubleshooting');
    expect(docContent).toContain('Common Issues');
  });

  test('should document customization instructions', () => {
    expect(docContent).toContain('Customization');
    expect(docContent).toContain('Replace');
  });

  test('should include security best practices', () => {
    expect(docContent).toContain('Security');
    expect(docContent).toContain('service role');
  });

  test('should have proper markdown formatting', () => {
    // Should have main title
    expect(docContent).toMatch(/^#\s+/m);
    // Should have sections
    expect(docContent).toMatch(/^##\s+/m);
    // Should have code blocks
    expect(docContent).toContain('```');
  });

  test('should reference the schema.sql file', () => {
    expect(docContent).toContain('schema.sql');
    expect(docContent).toContain('supabase/schema.sql');
  });
});
