/**
 * Test for Database Schema
 *
 * This test validates the database schema SQL file to ensure:
 * 1. The schema file exists and is readable
 * 2. Contains all required table definitions
 * 3. Includes RLS policies for security
 * 4. Has proper indexes for performance
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema', () => {
  let schemaContent: string;

  beforeAll(() => {
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  });

  describe('schema file structure', () => {
    it('should exist and be readable', () => {
      expect(schemaContent).toBeDefined();
      expect(schemaContent.length).toBeGreaterThan(0);
    });

    it('should contain SQL comments for documentation', () => {
      expect(schemaContent).toContain('--');
      expect(schemaContent).toMatch(/EverReach Backend Starter Kit/i);
    });
  });

  describe('required tables', () => {
    it('should create users table', () => {
      expect(schemaContent).toMatch(/CREATE TABLE.*public\.users/i);
      expect(schemaContent).toContain('id UUID PRIMARY KEY');
      expect(schemaContent).toContain('email TEXT');
      expect(schemaContent).toContain('full_name TEXT');
      expect(schemaContent).toContain('avatar_url TEXT');
    });

    it('should create subscriptions table', () => {
      expect(schemaContent).toMatch(/CREATE TABLE.*public\.subscriptions/i);
      expect(schemaContent).toContain('user_id UUID');
      expect(schemaContent).toContain('tier');
      expect(schemaContent).toContain('status');
      expect(schemaContent).toContain('stripe_customer_id');
      expect(schemaContent).toContain('revenuecat_subscriber_id');
    });

    it('should create items table', () => {
      expect(schemaContent).toMatch(/CREATE TABLE.*public\.items/i);
      expect(schemaContent).toContain('user_id UUID');
      expect(schemaContent).toContain('title TEXT');
      expect(schemaContent).toContain('description TEXT');
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enable RLS on users table', () => {
      expect(schemaContent).toMatch(/ALTER TABLE public\.users ENABLE ROW LEVEL SECURITY/i);
    });

    it('should enable RLS on subscriptions table', () => {
      expect(schemaContent).toMatch(/ALTER TABLE public\.subscriptions ENABLE ROW LEVEL SECURITY/i);
    });

    it('should enable RLS on items table', () => {
      expect(schemaContent).toMatch(/ALTER TABLE public\.items ENABLE ROW LEVEL SECURITY/i);
    });

    it('should have RLS policies for users', () => {
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR SELECT.*ON public\.users/is);
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR UPDATE.*ON public\.users/is);
    });

    it('should have RLS policies for subscriptions', () => {
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR SELECT.*ON public\.subscriptions/is);
    });

    it('should have RLS policies for items', () => {
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR SELECT.*ON public\.items/is);
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR INSERT.*ON public\.items/is);
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR UPDATE.*ON public\.items/is);
      expect(schemaContent).toMatch(/CREATE POLICY.*FOR DELETE.*ON public\.items/is);
    });

    it('should use auth.uid() in RLS policies', () => {
      const authUidMatches = schemaContent.match(/auth\.uid\(\)/gi);
      expect(authUidMatches).toBeDefined();
      expect(authUidMatches!.length).toBeGreaterThan(5);
    });
  });

  describe('indexes for performance', () => {
    it('should create index on users email', () => {
      expect(schemaContent).toMatch(/CREATE INDEX.*idx_users_email/i);
    });

    it('should create index on items user_id', () => {
      expect(schemaContent).toMatch(/CREATE INDEX.*idx_items_user_id/i);
    });

    it('should create index on subscriptions user_id', () => {
      expect(schemaContent).toMatch(/CREATE INDEX.*idx_subscriptions_user_id/i);
    });

    it('should create full-text search index on items', () => {
      expect(schemaContent).toMatch(/CREATE INDEX.*idx_items_search/i);
      expect(schemaContent).toContain('to_tsvector');
    });
  });

  describe('timestamp triggers', () => {
    it('should define updated_at trigger function', () => {
      expect(schemaContent).toMatch(/CREATE.*FUNCTION public\.handle_updated_at/i);
      expect(schemaContent).toContain('NEW.updated_at = NOW()');
    });

    it('should apply updated_at trigger to users table', () => {
      expect(schemaContent).toMatch(/CREATE TRIGGER users_updated_at/i);
    });

    it('should apply updated_at trigger to subscriptions table', () => {
      expect(schemaContent).toMatch(/CREATE TRIGGER subscriptions_updated_at/i);
    });

    it('should apply updated_at trigger to items table', () => {
      expect(schemaContent).toMatch(/CREATE TRIGGER items_updated_at/i);
    });
  });

  describe('enums', () => {
    it('should define subscription_tier enum', () => {
      expect(schemaContent).toMatch(/CREATE TYPE subscription_tier AS ENUM/i);
      expect(schemaContent).toContain("'free'");
      expect(schemaContent).toContain("'basic'");
      expect(schemaContent).toContain("'premium'");
      expect(schemaContent).toContain("'enterprise'");
    });

    it('should define subscription_status enum', () => {
      expect(schemaContent).toMatch(/CREATE TYPE subscription_status AS ENUM/i);
      expect(schemaContent).toContain("'active'");
      expect(schemaContent).toContain("'canceled'");
      expect(schemaContent).toContain("'expired'");
    });
  });

  describe('functions and triggers', () => {
    it('should create handle_new_user function', () => {
      expect(schemaContent).toMatch(/CREATE.*FUNCTION public\.handle_new_user/i);
    });

    it('should create trigger on auth.users for new user creation', () => {
      expect(schemaContent).toMatch(/CREATE TRIGGER on_auth_user_created/i);
      expect(schemaContent).toContain('auth.users');
      expect(schemaContent).toContain('handle_new_user');
    });

    it('should create has_subscription_tier function', () => {
      expect(schemaContent).toMatch(/CREATE.*FUNCTION public\.has_subscription_tier/i);
    });
  });

  describe('foreign key relationships', () => {
    it('should reference auth.users in users table', () => {
      expect(schemaContent).toMatch(/REFERENCES auth\.users.*ON DELETE CASCADE/i);
    });

    it('should reference users in subscriptions table', () => {
      const subscriptionsSection = schemaContent.match(
        /CREATE TABLE.*public\.subscriptions[\s\S]*?;/i
      );
      expect(subscriptionsSection).toBeDefined();
      expect(subscriptionsSection![0]).toMatch(/user_id.*REFERENCES public\.users/i);
      expect(subscriptionsSection![0]).toContain('ON DELETE CASCADE');
    });

    it('should reference users in items table', () => {
      const itemsSection = schemaContent.match(
        /CREATE TABLE.*public\.items[\s\S]*?;/i
      );
      expect(itemsSection).toBeDefined();
      expect(itemsSection![0]).toMatch(/user_id.*REFERENCES public\.users/i);
    });
  });

  describe('UUID extension', () => {
    it('should enable UUID extension', () => {
      expect(schemaContent).toMatch(/CREATE EXTENSION.*uuid-ossp/i);
    });

    it('should use uuid_generate_v4() for default IDs', () => {
      expect(schemaContent).toContain('uuid_generate_v4()');
    });
  });

  describe('timestamp defaults', () => {
    it('should set created_at default to NOW()', () => {
      const createdAtMatches = schemaContent.match(/created_at.*DEFAULT NOW\(\)/gi);
      expect(createdAtMatches).toBeDefined();
      expect(createdAtMatches!.length).toBeGreaterThan(2);
    });

    it('should set updated_at default to NOW()', () => {
      const updatedAtMatches = schemaContent.match(/updated_at.*DEFAULT NOW\(\)/gi);
      expect(updatedAtMatches).toBeDefined();
      expect(updatedAtMatches!.length).toBeGreaterThan(2);
    });
  });
});
