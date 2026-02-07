/**
 * User Type Definitions
 * Feature: IOS-DATA-002
 *
 * Defines TypeScript types for User entity and profile management.
 * These types are synced with Supabase Auth and the public.users table.
 *
 * @module types/user
 */

/**
 * User entity representing an authenticated user
 * Synced with Supabase Auth and public.users table
 */
export interface User {
  /**
   * Unique user identifier (UUID)
   * Matches Supabase Auth user ID
   */
  id: string;

  /**
   * User's email address (required)
   */
  email: string;

  /**
   * User's full name (display name)
   */
  full_name?: string | null;

  /**
   * URL to user's avatar/profile picture
   * Can be Supabase Storage URL or external URL
   */
  avatar_url?: string | null;

  /**
   * Timestamp when user account was created
   */
  created_at: string;

  /**
   * Timestamp when user profile was last updated
   */
  updated_at?: string;
}

/**
 * User profile information (subset of User for display purposes)
 * Used in profile screens and settings
 */
export interface UserProfile {
  /**
   * User ID
   */
  id: string;

  /**
   * User's email
   */
  email: string;

  /**
   * User's full name
   */
  full_name?: string | null;

  /**
   * Avatar URL
   */
  avatar_url?: string | null;
}

/**
 * Input for updating user profile
 * Only includes fields that can be updated by the user
 */
export interface UserProfileUpdateInput {
  /**
   * Update full name
   */
  full_name?: string | null;

  /**
   * Update avatar URL
   */
  avatar_url?: string | null;
}
