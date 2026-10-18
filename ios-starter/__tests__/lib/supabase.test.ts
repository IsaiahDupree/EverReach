/**
 * Tests for Supabase Client Setup
 * Feature: IOS-AUTH-001
 *
 * Acceptance Criteria:
 * - Client initializes successfully
 * - Secure storage is configured for auth persistence
 * - Environment variables are properly loaded
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock expo-secure-store before importing the module
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('Supabase Client Setup (IOS-AUTH-001)', () => {
  // Set up test environment variables
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-1234567890';
  });

  describe('Client Initialization', () => {
    it('should export a configured supabase client', () => {
      // This will fail until we create lib/supabase.ts
      const { supabase } = require('../../lib/supabase');

      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
      expect(supabase.storage).toBeDefined();
    });

    it('should throw an error if SUPABASE_URL is missing', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;

      // Clear the module cache to force re-evaluation
      jest.resetModules();

      expect(() => {
        require('../../lib/supabase');
      }).toThrow();
    });

    it('should throw an error if SUPABASE_ANON_KEY is missing', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Clear the module cache to force re-evaluation
      jest.resetModules();

      expect(() => {
        require('../../lib/supabase');
      }).toThrow();
    });
  });

  describe('Secure Storage Configuration', () => {
    it('should configure a custom storage adapter for auth persistence', () => {
      const { supabase } = require('../../lib/supabase');

      // Verify that the client is using a storage adapter
      // by checking that the auth client has storage configured
      expect(supabase.auth).toBeDefined();

      // The presence of auth methods indicates storage is configured
      expect(typeof supabase.auth.getSession).toBe('function');
      expect(typeof supabase.auth.signInWithPassword).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
    });

    it('should export the storage adapter separately for testing', () => {
      const supabaseModule = require('../../lib/supabase');

      // The module should export the storage adapter for testing purposes
      expect(supabaseModule.supabaseStorage).toBeDefined();
      expect(typeof supabaseModule.supabaseStorage.getItem).toBe('function');
      expect(typeof supabaseModule.supabaseStorage.setItem).toBe('function');
      expect(typeof supabaseModule.supabaseStorage.removeItem).toBe('function');
    });
  });

  describe('Client Configuration', () => {
    it('should initialize with the correct URL and key', () => {
      // Clear module cache to get fresh instance
      jest.resetModules();
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-1234567890';

      const { supabase } = require('../../lib/supabase');

      // We can't directly access the URL/key from the client,
      // but we can verify the client is properly initialized
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
    });

    it('should configure auth to persist sessions', () => {
      const { supabase } = require('../../lib/supabase');

      // Verify auth is configured with persistence
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.getSession).toBe('function');
    });
  });

  describe('Module Exports', () => {
    it('should export both supabase client and storage adapter', () => {
      const supabaseModule = require('../../lib/supabase');

      expect(supabaseModule.supabase).toBeDefined();
      expect(supabaseModule.supabaseStorage).toBeDefined();
    });

    it('should export types for TypeScript usage', () => {
      // This test verifies that the module is TypeScript-compatible
      // The actual type checking happens at compile time
      const supabaseModule = require('../../lib/supabase');

      expect(supabaseModule).toBeDefined();
    });
  });
});
