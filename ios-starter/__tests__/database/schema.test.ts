/**
 * Database Schema Tests
 *
 * Tests for the Supabase database schema
 * Feature: IOS-DB-001
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema', () => {
  // Reference the canonical schema in backend-kit
  const schemaPath = path.join(__dirname, '../../../backend-kit/supabase/schema.sql');

  it('should have a schema.sql file', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  describe('Schema Content', () => {
    let schemaContent: string;

    beforeAll(() => {
      schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    });

    describe('Tables', () => {
      it('should create users table', () => {
        expect(schemaContent).toMatch(/CREATE TABLE.*public\.users/i);
      });

      it('should create items table', () => {
        expect(schemaContent).toMatch(/CREATE TABLE.*public\.items/i);
      });

      it('should create subscriptions table', () => {
        expect(schemaContent).toMatch(/CREATE TABLE.*public\.subscriptions/i);
      });
    });

    describe('Users Table Schema', () => {
      it('should have id as primary key referencing auth.users', () => {
        const usersTableMatch = schemaContent.match(/CREATE TABLE.*public\.users[\s\S]*?\);/i);
        expect(usersTableMatch).toBeTruthy();
        const usersTable = usersTableMatch![0];

        expect(usersTable).toMatch(/id\s+UUID.*PRIMARY KEY/i);
        expect(usersTable).toMatch(/REFERENCES\s+auth\.users/i);
      });

      it('should have email field', () => {
        const usersTableMatch = schemaContent.match(/CREATE TABLE.*public\.users[\s\S]*?\);/i);
        const usersTable = usersTableMatch![0];
        expect(usersTable).toMatch(/email\s+TEXT/i);
      });

      it('should have full_name field', () => {
        const usersTableMatch = schemaContent.match(/CREATE TABLE.*public\.users[\s\S]*?\);/i);
        const usersTable = usersTableMatch![0];
        expect(usersTable).toMatch(/full_name\s+TEXT/i);
      });

      it('should have avatar_url field', () => {
        const usersTableMatch = schemaContent.match(/CREATE TABLE.*public\.users[\s\S]*?\);/i);
        const usersTable = usersTableMatch![0];
        expect(usersTable).toMatch(/avatar_url\s+TEXT/i);
      });

      it('should have created_at and updated_at timestamps', () => {
        const usersTableMatch = schemaContent.match(/CREATE TABLE.*public\.users[\s\S]*?\);/i);
        const usersTable = usersTableMatch![0];
        expect(usersTable).toMatch(/created_at\s+TIMESTAMPTZ/i);
        expect(usersTable).toMatch(/updated_at\s+TIMESTAMPTZ/i);
      });
    });

    describe('Items Table Schema', () => {
      it('should have id as primary key with default UUID', () => {
        const itemsTableMatch = schemaContent.match(/CREATE TABLE.*public\.items[\s\S]*?\);/i);
        expect(itemsTableMatch).toBeTruthy();
        const itemsTable = itemsTableMatch![0];

        expect(itemsTable).toMatch(/id\s+UUID.*PRIMARY KEY/i);
        expect(itemsTable).toMatch(/DEFAULT\s+gen_random_uuid\(\)/i);
      });

      it('should have user_id foreign key with CASCADE delete', () => {
        const itemsTableMatch = schemaContent.match(/CREATE TABLE.*public\.items[\s\S]*?\);/i);
        const itemsTable = itemsTableMatch![0];

        expect(itemsTable).toMatch(/user_id\s+UUID.*NOT NULL/i);
        expect(itemsTable).toMatch(/REFERENCES\s+public\.users\(id\)/i);
        expect(itemsTable).toMatch(/ON DELETE CASCADE/i);
      });

      it('should have title field', () => {
        const itemsTableMatch = schemaContent.match(/CREATE TABLE.*public\.items[\s\S]*?\);/i);
        const itemsTable = itemsTableMatch![0];
        expect(itemsTable).toMatch(/title\s+TEXT/i);
      });

      it('should have description field', () => {
        const itemsTableMatch = schemaContent.match(/CREATE TABLE.*public\.items[\s\S]*?\);/i);
        const itemsTable = itemsTableMatch![0];
        expect(itemsTable).toMatch(/description\s+TEXT/i);
      });

      it('should have created_at and updated_at timestamps', () => {
        const itemsTableMatch = schemaContent.match(/CREATE TABLE.*public\.items[\s\S]*?\);/i);
        const itemsTable = itemsTableMatch![0];
        expect(itemsTable).toMatch(/created_at\s+TIMESTAMPTZ/i);
        expect(itemsTable).toMatch(/updated_at\s+TIMESTAMPTZ/i);
      });
    });

    describe('Subscriptions Table Schema', () => {
      it('should have id as primary key with default UUID', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        expect(subsTableMatch).toBeTruthy();
        const subsTable = subsTableMatch![0];

        expect(subsTable).toMatch(/id\s+UUID.*PRIMARY KEY/i);
        expect(subsTable).toMatch(/DEFAULT\s+gen_random_uuid\(\)/i);
      });

      it('should have user_id foreign key with CASCADE delete', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];

        expect(subsTable).toMatch(/user_id\s+UUID.*NOT NULL/i);
        expect(subsTable).toMatch(/REFERENCES\s+public\.users\(id\)/i);
        expect(subsTable).toMatch(/ON DELETE CASCADE/i);
      });

      it('should have tier field with default free', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];
        expect(subsTable).toMatch(/tier\s+TEXT.*DEFAULT\s+'free'/i);
      });

      it('should have status field', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];
        expect(subsTable).toMatch(/status\s+TEXT/i);
      });

      it('should have provider field', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];
        expect(subsTable).toMatch(/provider\s+TEXT/i);
      });

      it('should have expires_at timestamp', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];
        expect(subsTable).toMatch(/expires_at\s+TIMESTAMPTZ/i);
      });

      it('should have created_at timestamp', () => {
        const subsTableMatch = schemaContent.match(/CREATE TABLE.*public\.subscriptions[\s\S]*?\);/i);
        const subsTable = subsTableMatch![0];
        expect(subsTable).toMatch(/created_at\s+TIMESTAMPTZ/i);
      });
    });

    describe('Row Level Security (RLS)', () => {
      it('should enable RLS on users table', () => {
        expect(schemaContent).toMatch(/ALTER TABLE.*public\.users.*ENABLE ROW LEVEL SECURITY/i);
      });

      it('should enable RLS on items table', () => {
        expect(schemaContent).toMatch(/ALTER TABLE.*public\.items.*ENABLE ROW LEVEL SECURITY/i);
      });

      it('should enable RLS on subscriptions table', () => {
        expect(schemaContent).toMatch(/ALTER TABLE.*public\.subscriptions.*ENABLE ROW LEVEL SECURITY/i);
      });
    });

    describe('RLS Policies', () => {
      it('should have policy for users to read own profile', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can read own profile/i);
        expect(schemaContent).toMatch(/ON public\.users FOR SELECT/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*id/i);
      });

      it('should have policy for users to update own profile', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can update own profile/i);
        expect(schemaContent).toMatch(/ON public\.users FOR UPDATE/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*id/i);
      });

      it('should have policy for users to read own items', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can read own items/i);
        expect(schemaContent).toMatch(/ON public\.items FOR SELECT/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
      });

      it('should have policy for users to create own items', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can create own items/i);
        expect(schemaContent).toMatch(/ON public\.items FOR INSERT/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
      });

      it('should have policy for users to update own items', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can update own items/i);
        expect(schemaContent).toMatch(/ON public\.items FOR UPDATE/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
      });

      it('should have policy for users to delete own items', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can delete own items/i);
        expect(schemaContent).toMatch(/ON public\.items FOR DELETE/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
      });

      it('should have policy for users to read own subscription', () => {
        expect(schemaContent).toMatch(/CREATE POLICY.*Users can read own subscription/i);
        expect(schemaContent).toMatch(/ON public\.subscriptions FOR SELECT/i);
        expect(schemaContent).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
      });
    });

    describe('Indexes', () => {
      it('should have index on items.user_id', () => {
        expect(schemaContent).toMatch(/CREATE INDEX.*items_user_id/i);
        expect(schemaContent).toMatch(/ON public\.items\s*\(\s*user_id\s*\)/i);
      });

      it('should have index on subscriptions.user_id', () => {
        expect(schemaContent).toMatch(/CREATE INDEX.*subscriptions_user_id/i);
        expect(schemaContent).toMatch(/ON public\.subscriptions\s*\(\s*user_id\s*\)/i);
      });
    });
  });
});
