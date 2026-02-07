/**
 * Supabase Client Configuration for React Native
 * Feature: IOS-AUTH-001
 *
 * This module initializes the Supabase client with:
 * - Secure storage for auth token persistence
 * - React Native specific configuration
 * - Environment variable validation
 *
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom storage adapter for Supabase auth using Expo SecureStore
 * This ensures auth tokens are stored securely on the device
 */
export const supabaseStorage = {
  /**
   * Retrieve an item from secure storage
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try SecureStore first (encrypted storage)
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (error) {
      // Fallback to AsyncStorage if SecureStore fails
      console.warn('SecureStore getItem failed, falling back to AsyncStorage:', error);
      return await AsyncStorage.getItem(key);
    }
  },

  /**
   * Store an item in secure storage
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // Try SecureStore first (encrypted storage)
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      // Fallback to AsyncStorage if SecureStore fails
      console.warn('SecureStore setItem failed, falling back to AsyncStorage:', error);
      await AsyncStorage.setItem(key, value);
    }
  },

  /**
   * Remove an item from secure storage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      // Try SecureStore first (encrypted storage)
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // Fallback to AsyncStorage if SecureStore fails
      console.warn('SecureStore removeItem failed, falling back to AsyncStorage:', error);
      await AsyncStorage.removeItem(key);
    }
  },
};

/**
 * Validate required environment variables
 */
const validateEnvVars = (): { url: string; anonKey: string } => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env file. ' +
      'Get your URL from https://app.supabase.com/project/_/settings/api'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please add it to your .env file. ' +
      'Get your anon key from https://app.supabase.com/project/_/settings/api'
    );
  }

  return { url, anonKey };
};

// Validate environment variables at module load time
const { url, anonKey } = validateEnvVars();

/**
 * Supabase client instance
 * Configured with secure storage for auth persistence
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    // Use custom storage adapter for secure token persistence
    storage: supabaseStorage,
    // Auto refresh tokens to keep user logged in
    autoRefreshToken: true,
    // Persist session across app restarts
    persistSession: true,
    // Detect when session is about to expire and refresh
    detectSessionInUrl: false, // Not needed for React Native
  },
});

/**
 * Type helper to get the Supabase client type
 * Useful for creating typed hooks and utilities
 */
export type SupabaseClient = typeof supabase;

/**
 * Export the database type for use in typed queries
 * This will be auto-generated from your database schema
 */
export type Database = any; // TODO: Generate types from database schema
